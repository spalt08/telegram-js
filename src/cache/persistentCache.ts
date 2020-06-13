import { BehaviorSubject } from 'rxjs';
import { Chat, Dialog, DialogFilter, Message, Peer, TopPeer, User } from 'mtproto-js';
import { getValue } from 'helpers/indexedDb';
import { dialogToId, inputPeerToPeer, peerMessageToId, peerToDialogId } from 'helpers/api';
import { animationFrameStart } from 'core/dom';
import { runTransaction } from './persistentStorages/database';
import Collection from './fastStorages/collection';

const indexedDBStore = 'cache';
const indexedDBKey = 'persistentCache';
const sequentialDialogsToStoreCount = 50;
const maxFiltersCount = 20;
const autosaveStartDelay = 2000;
const autosaveInterval = 10000;

interface CacheValue {
  chats?: Record<number, Chat>;
  dialogs?: Dialog[];
  messages?: Record<string, Message>;
  users?: Record<number, User>;
  searchRecentPeers?: readonly Peer[];
  topUsers?: {
    items: TopPeer[];
    fetchedAt: number; // unix ms
  };
  filters?: readonly Readonly<DialogFilter>[];
}

function autosaveStrategy(save: () => Promise<void> | void) {
  let isSaving = false;

  window.addEventListener('beforeunload', () => {
    if (!isSaving) {
      save();
    }
  });

  const handleTimeout = async () => {
    try {
      await animationFrameStart();
      isSaving = true;
      await save();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('Failed to save FastRestartCache');
      }
      throw error;
    } finally {
      isSaving = false;
      setTimeout(handleTimeout, autosaveInterval);
    }
  };

  setTimeout(handleTimeout, autosaveStartDelay);
}

// todo: Clear on log out / sign out / exit
export default class PersistentCache {
  readonly isRestored = new BehaviorSubject(false);

  // Just write here when you want to save the cache
  public searchRecentPeers?: readonly Peer[];
  public topUsers?: {
    items: TopPeer[],
    fetchedAt: number, // unix ms
  };
  public filters?: readonly Readonly<DialogFilter>[];

  constructor(
    private messageCache: Collection<Message, {}, string>,
    private userCache: Collection<User, {}, number>,
    private chatCache: Collection<Chat, {}, number>,
    private dialogCache: Collection<Dialog, {
      recentFirst: {
        getLength(): number,
        getIdAt(index: number): string,
      },
      pinned: {
        eachId(callback: (id: string) => void): void,
        add(to: 'end', ids: string[]): void,
      },
    }, keyof any>,
  ) {
    this.restoreCache()
      .catch((error) => {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('Failed to load FastRestartCache');
        }
        throw error;
      })
      .finally(() => {
        autosaveStrategy(() => this.backupCache());
      });
  }

  private async restoreCache() {
    try {
      const data = await runTransaction(indexedDBStore, 'readonly', (transaction) => (
        getValue(transaction.objectStore(indexedDBStore), indexedDBKey)
      ));

      const {
        chats = {},
        dialogs = [],
        users = {},
        messages = [],
        searchRecentPeers,
        topUsers,
        filters,
      } = (data && typeof data === 'object' ? data : {}) as CacheValue;
      const { messageCache, userCache, chatCache, dialogCache } = this;

      chatCache.batchChanges(() => {
        Object.entries(chats).forEach(([id, chat]) => {
          if (!chatCache.has(Number(id))) chatCache.put(chat);
        });
      });

      userCache.batchChanges(() => {
        Object.entries(users).forEach(([id, user]) => {
          if (!userCache.has(Number(id))) userCache.put(user);
        });
      });

      messageCache.batchChanges(() => {
        Object.entries(messages).forEach(([id, message]) => {
          if (!messageCache.has(id)) messageCache.put(message);
        });
      });

      dialogCache.batchChanges(() => {
        const pinnedIds: string[] = [];

        dialogs.forEach((dialog) => {
          const id = dialogToId(dialog);
          if (!dialogCache.has(id)) {
            dialogCache.put(dialog);
            if (dialog.pinned) {
              pinnedIds.push(id);
            }
          }
        });

        this.dialogCache.indices.pinned.add('end', pinnedIds);
      });

      if (searchRecentPeers) {
        this.searchRecentPeers = searchRecentPeers;
      }

      if (topUsers) {
        this.topUsers = topUsers;
      }

      if (filters) {
        this.filters = filters;
      }
    } finally {
      this.isRestored.next(true);
    }
  }

  private async backupCache() {
    const data = this.collectDataToCache();

    await runTransaction(indexedDBStore, 'readwrite', (transaction) => {
      const store = transaction.objectStore(indexedDBStore);
      store.put(data, indexedDBKey);
    });
  }

  private collectDataToCache(): CacheValue {
    const data: CacheValue & Required<Pick<CacheValue, 'dialogs' | 'messages' | 'users' | 'chats'>> = {
      dialogs: this.collectDialogs(this.filters || []),
      messages: {} as Record<string, Message>,
      users: {} as Record<number, User>,
      chats: {} as Record<number, Chat>,
    };

    data.dialogs.forEach((dialog) => this.collectDialogModels(dialog, data));

    if (this.searchRecentPeers) {
      data.searchRecentPeers = this.searchRecentPeers;
      this.searchRecentPeers.forEach((peer) => this.collectPeerModels(peer, data));
    }

    if (this.topUsers) {
      data.topUsers = this.topUsers;
      this.topUsers.items.forEach(({ peer }) => this.collectPeerModels(peer, data));
    }

    if (this.filters) {
      data.filters = this.filters;
    }

    return data;
  }

  private collectDialogs(filters: readonly Readonly<DialogFilter>[]): Dialog[] {
    const dialogs = new Map<string, Dialog>();
    const { pinned, recentFirst } = this.dialogCache.indices;

    // First add all dialogs pinned in folders
    pinned.eachId((id) => {
      if (dialogs.size < sequentialDialogsToStoreCount) {
        const dialog = this.dialogCache.get(id);
        if (dialog) {
          dialogs.set(id, dialog);
        }
      }
    });

    // Then recent dialogs
    for (
      let i = 0, l = recentFirst.getLength();
      i < l && dialogs.size < sequentialDialogsToStoreCount;
      ++i
    ) {
      const id = recentFirst.getIdAt(i);
      const dialog = this.dialogCache.get(id);
      if (dialog) {
        dialogs.set(id, dialog);
      }
    }

    // And dialogs pinned in filter
    for (let i = 0; i < filters.length && i < maxFiltersCount; ++i) {
      filters[i].pinned_peers.forEach((inputPeer) => {
        const peer = inputPeerToPeer(inputPeer);
        if (peer) {
          const id = peerToDialogId(peer);
          const dialog = this.dialogCache.get(id);
          if (dialog) {
            dialogs.set(id, dialog);
          }
        }
      });
    }

    return [...dialogs.values()];
  }

  private collectDialogModels(
    dialog: Dialog,
    models: { messages: Record<string, Message>, users: Record<number, User>, chats: Record<number, Chat> },
  ) {
    if (dialog._ === 'dialog') {
      this.collectPeerModels(dialog.peer, models);

      const topMessageId = peerMessageToId(dialog.peer, dialog.top_message);
      const topMessage = this.messageCache.get(topMessageId);

      if (topMessage) {
        // eslint-disable-next-line no-param-reassign
        models.messages[topMessageId] = topMessage;
        if (dialog.peer._ !== 'peerUser' && topMessage._ !== 'messageEmpty' && topMessage.from_id) {
          const user = this.userCache.get(topMessage.from_id);
          if (user) {
            // eslint-disable-next-line no-param-reassign
            models.users[topMessage.from_id] = user;
          }
        }
      }
    }
  }

  private collectPeerModels(peer: Peer, models: { users: Record<number, User>, chats: Record<number, Chat> }) {
    switch (peer._) {
      case 'peerUser': {
        const user = this.userCache.get(peer.user_id);
        if (user) {
          // eslint-disable-next-line no-param-reassign
          models.users[peer.user_id] = user;
        }
        break;
      }
      case 'peerChat':
      case 'peerChannel': {
        const chatId = peer._ === 'peerChat' ? peer.chat_id : peer.channel_id;
        const chat = this.chatCache.get(chatId);
        if (chat) {
          // eslint-disable-next-line no-param-reassign
          models.chats[chatId] = chat;
        }
        break;
      }
      default:
    }
  }
}
