import { dialogToId, messageToId, peerMessageToId } from 'helpers/api';
import Collection, { makeGetIdFromProp } from './fastStorages/collection';
import { Chat, Dialog, Message, User } from './types';
import { orderBy } from './fastStorages/indices';

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

/**
 * Message repo
 * Ref: https://core.telegram.org/constructor/message
 */
export const messageCache = new Collection<Message, {}, string>({
  getId: messageToId,
});

/**
 * Dialog repo
 * Ref: https://core.telegram.org/type/dialog
 * @todo Leave the manual sort (fetched from the server) for the pinned dialogs
 */
export const dialogCache = new Collection({
  considerMin: false,
  getId: dialogToId,
  indices: {
    order: orderBy((dialog1: Dialog, dialog2: Dialog) => {
      // Pinned first
      if (dialog1.pinned !== dialog2.pinned) {
        return (dialog2.pinned ? 1 : 0) - (dialog1.pinned ? 1 : 0);
      }
      // If both are (not) pinned, with most recent message first
      const message1 = messageCache.get(peerMessageToId(dialog1.peer, dialog1.top_message));
      const message2 = messageCache.get(peerMessageToId(dialog2.peer, dialog2.top_message));
      return (message2 && message2._ !== 'messageEmpty' ? message2.date : 0) - (message1 && message1._ !== 'messageEmpty' ? message1.date : 0);
    }),
  },
});


// todo remove debug
(window as any).mcache = messageCache;