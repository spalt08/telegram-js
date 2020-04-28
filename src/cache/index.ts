import {
  dialogToId,
  isDialogInRootFolder,
  messageToId,
  peerMessageToId,
  peerToId,
} from 'helpers/api';
import { Chat, Dialog, Message, User, UserFull, ChatFull } from 'mtproto-js';
import { considerMinItemMerger } from './fastStorages/dictionary';
import Collection, { GetId, makeGetIdFromProp } from './fastStorages/collection';
import { orderBy } from './fastStorages/indices';
import messageHistory from './fastStorages/indices/messageHistory';
import sharedMediaIndex from './fastStorages/indices/sharedMediaIndex';

// todo: Save the main part of the cache to a persistent storage

/**
 * User repo
 * Ref: https://core.telegram.org/constructor/user
 */
export const userCache = new Collection({
  getId: makeGetIdFromProp('id') as GetId<User, number>,
  itemMerger: considerMinItemMerger,
});

/**
 * Chat repo
 * Ref: https://core.telegram.org/constructor/chat
 */
export const chatCache = new Collection({
  getId: makeGetIdFromProp('id') as GetId<Chat, number>,
  itemMerger(chat1, chat2) {
    // Sometimes server returns channel objects with participants_count value wrongly equal to 0 (for example, in _='messages. ' responses)
    // This is a workaround to not loose the participants information
    if (
      !(chat1._ === 'channel' && chat1.participants_count === undefined)
      && chat2._ === 'channel' && chat2.participants_count === undefined
    ) {
      return chat1;
    }
    return considerMinItemMerger<Chat>(chat1, chat2);
  },
});

/**
 * Message repo
 * Ref: https://core.telegram.org/constructor/message
 */
export const messageCache = new Collection({
  getId: messageToId as GetId<Message, string>,
  indices: {
    history: messageHistory,
    photoVideos: sharedMediaIndex,
    documents: sharedMediaIndex,
    links: sharedMediaIndex,
  },
});

/**
 * Dialog repo
 * Ref: https://core.telegram.org/type/dialog
 * @todo Leave the manual sort (fetched from the server) for the pinned dialogs
 */
export const dialogCache = new Collection({
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

if (process.env.NODE_ENV !== 'production') {
  (window as any).mcache = messageCache;
  (window as any).ccache = chatCache;
  (window as any).dcache = dialogCache;
  (window as any).ucache = userCache;
}
