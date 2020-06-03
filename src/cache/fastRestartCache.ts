import { ReplaySubject } from 'rxjs';
import { Chat, Dialog, Message, Peer, User } from 'mtproto-js';
import { addValues, getAllEntries, getAllValues, putValuesEntries } from 'helpers/indexedDb';
import { peerMessageToId } from 'helpers/api';
import { animationFrameStart } from 'core/dom';
import { runTransaction } from './persistentStorages/database';
import Collection from './fastStorages/collection';

const dialogsToStoreCount = 50;
const autosaveInterval = 30000;

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

  setTimeout(handleTimeout, autosaveInterval);
}

export default class FastRestartCache {
  // Fires once when the cache is restored. Fires when subscribed after the cache is restored.
  readonly restoredEmitter = new ReplaySubject<void>(1);

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
      const [
        messages,
        users,
        chats,
        dialogs,
      ] = await runTransaction(['messages', 'users', 'chats', 'dialogs'], 'readonly', (transaction) => (
        Promise.all([
          getAllEntries<string, Message>(transaction.objectStore('messages')),
          getAllEntries<number, User>(transaction.objectStore('users')),
          getAllEntries<number, Chat>(transaction.objectStore('chats')),
          getAllValues<Dialog>(transaction.objectStore('dialogs')),
        ])
      ));

      const { messageCache, userCache, chatCache, dialogCache } = this;

      chatCache.batchChanges(() => {
        chats.forEach(([id, chat]) => {
          if (!chatCache.has(id)) chatCache.put(chat);
        });
      });

      userCache.batchChanges(() => {
        users.forEach(([id, user]) => {
          if (!userCache.has(id)) userCache.put(user);
        });
      });

      messageCache.batchChanges(() => {
        messages.forEach(([id, message]) => {
          if (!messageCache.has(id)) messageCache.put(message);
        });
      });

      // Don't change the dialogs list if it already exists. It means that it's been loaded from API and contains more actual data.
      if (dialogCache.count() === 0) {
        dialogCache.replaceAll(dialogs);
      }
    } finally {
      this.restoredEmitter.next();
    }
  }

  private async backupCache() {
    const { dialogs, messages, users, chats } = this.collectDataToCache();

    await runTransaction(['messages', 'users', 'chats', 'dialogs'], 'readwrite', (transaction) => {
      const messageStore = transaction.objectStore('messages');
      messageStore.clear();
      putValuesEntries(messageStore, messages);

      const userStore = transaction.objectStore('users');
      userStore.clear();
      putValuesEntries(userStore, users);

      const chatStore = transaction.objectStore('chats');
      chatStore.clear();
      putValuesEntries(chatStore, chats);

      const dialogStore = transaction.objectStore('dialogs');
      dialogStore.clear();
      addValues(dialogStore, dialogs);
    });
  }

  private collectDataToCache() {
    const dialogs = this.dialogCache.indices.order.getItems(0, dialogsToStoreCount);
    const messages: Array<[string, Message]> = [];
    const users: Array<[number, User]> = [];
    const chats: Array<[number, Chat]> = [];

    dialogs.forEach((dialog) => {
      if (dialog._ === 'dialog') {
        const topMessageId = peerMessageToId(dialog.peer, dialog.top_message);
        const topMessage = this.messageCache.get(topMessageId);
        if (topMessage) messages.push([topMessageId, topMessage]);
        this.collectPeerModels(dialog.peer, users, chats);
      }
    });

    return { dialogs, messages, users, chats };
  }

  private collectPeerModels(peer: Peer, users: Array<[number, User]>, chats: Array<[number, Chat]>) {
    switch (peer._) {
      case 'peerUser': {
        const user = this.userCache.get(peer.user_id);
        if (user) users.push([peer.user_id, user]);
        break;
      }
      case 'peerChat':
      case 'peerChannel': {
        const chatId = peer._ === 'peerChat' ? peer.chat_id : peer.channel_id;
        const chat = this.chatCache.get(chatId);
        if (chat) chats.push([chatId, chat]);
        break;
      }
      default:
    }
  }
}
