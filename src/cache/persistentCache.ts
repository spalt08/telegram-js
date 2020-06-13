import { BehaviorSubject } from 'rxjs';
import { Chat, Dialog, Message, Peer, TopPeer, User } from 'mtproto-js';
import { getValue } from 'helpers/indexedDb';
import { peerMessageToId } from 'helpers/api';
import { animationFrameStart } from 'core/dom';
import { runTransaction } from './persistentStorages/database';
import Collection from './fastStorages/collection';

const indexedDBStore = 'cache';
const indexedDBKey = 'persistentCache';
const dialogsToStoreCount = 50;
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

  constructor(
    private messageCache: Collection<Message, {}, string>,
    private userCache: Collection<User, {}, number>,
    private chatCache: Collection<Chat, {}, number>,
    private dialogCache: Collection<Dialog, { order: { getItems(start: number, end: number): Dialog[] } }, keyof any>,
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

      // Don't change the dialogs list if it already exists. It means that it's been loaded from API and contains more actual data.
      if (dialogCache.count() === 0) {
        dialogCache.replaceAll(dialogs);
      }

      if (searchRecentPeers) {
        this.searchRecentPeers = searchRecentPeers;
      }

      if (topUsers) {
        this.topUsers = topUsers;
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
      dialogs: this.dialogCache.indices.order.getItems(0, dialogsToStoreCount),
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

    return data;
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
