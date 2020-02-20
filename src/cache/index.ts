import {
  dialogToId,
  isDialogInRootFolder,
  messageToId,
  peerMessageToId,
  peerToId,
} from 'helpers/api';
import Collection, { GetId, makeGetIdFromProp } from './fastStorages/collection';
import Dictionary from './fastStorages/dictionary';
import { Chat, Dialog, Message, User, UserFull, ChatFull } from './types';
import { orderBy } from './fastStorages/indices';
import messageHistory from './fastStorages/indices/messageHistory';
import sharedMediaIndex from './fastStorages/indices/sharedMediaIndex';

// todo: Save the main part of the cache to a persistent storage

/**
 * User repo
 * Ref: https://core.telegram.org/constructor/user
 */
export const userCache = new Collection<User, {}, number>({
  getId: makeGetIdFromProp('id'),
});

/**
 * Chat repo
 * Ref: https://core.telegram.org/constructor/chat
 */
export const chatCache = new Collection<Chat, {}, number>({
  getId: makeGetIdFromProp('id'),
});

const messageCacheIndices = {
  history: messageHistory,
  photoVideos: sharedMediaIndex,
  documents: sharedMediaIndex,
  links: sharedMediaIndex,
};

/**
 * Message repo
 * Ref: https://core.telegram.org/constructor/message
 */
export const messageCache = new Collection<Message, typeof messageCacheIndices, string>({
  getId: messageToId,
  indices: messageCacheIndices,
});

/**
 * Dialog repo
 * Ref: https://core.telegram.org/type/dialog
 * @todo Leave the manual sort (fetched from the server) for the pinned dialogs
 */
export const dialogCache = new Collection({
  considerMin: false,
  getId: dialogToId as GetId<Dialog, string>,
  indices: {
    order: orderBy<Dialog>(
      (dialog1, dialog2) => {
        // Pinned first
        if (dialog1.pinned !== dialog2.pinned) {
          return (dialog2.pinned ? 1 : 0) - (dialog1.pinned ? 1 : 0);
        }
        // If both are (not) pinned, with most recent message first
        const message1 = messageCache.get(peerMessageToId(dialog1.peer, dialog1.top_message));
        const message2 = messageCache.get(peerMessageToId(dialog2.peer, dialog2.top_message));
        return (message2 && message2._ !== 'messageEmpty' ? message2.date : 0) - (message1 && message1._ !== 'messageEmpty' ? message1.date : 0);
      },
      (dialog) => {
        if (dialog._ === 'dialogFolder') {
          return false;
        }
        if (!isDialogInRootFolder(dialog)) {
          return false;
        }
        if (dialog.peer._ === 'peerChat') {
          const chat = chatCache.get(dialog.peer.chat_id);
          if (chat && chat._ === 'chat' && chat.migrated_to) {
            return false;
          }
        }
        return true;
      },
    ),
  },
});

export const userFullCache = new Collection<UserFull, {}, number>({
  getId: (userFull) => userFull.user.id,
});

export const chatFullCache = new Collection<ChatFull, {}, number>({
  getId: (chatFull) => chatFull.id,
});

export const pinnedMessageCache = new Collection<Message.message, {}, string>({
  getId: (msg: Message.message) => peerToId(msg.to_id),
});

/**
 * File urls cache
 */
export const fileCache = new Dictionary<string, string | null>();

if (process.env.NODE_ENV === 'development') {
  (window as any).mcache = messageCache;
  (window as any).ccache = chatCache;
  (window as any).dcache = dialogCache;
  (window as any).ucache = userCache;
  (window as any).fcache = fileCache;
}
