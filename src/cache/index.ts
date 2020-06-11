import { dialogToId, messageToId, peerToId } from 'helpers/api';
import { Chat, Dialog, Message, User, UserFull, ChatFull } from 'mtproto-js';
import { considerMinItemMerger } from './fastStorages/dictionary';
import Collection, { GetId, makeGetIdFromProp } from './fastStorages/collection';
import orderBy from './fastStorages/indices/orderBy';
import messageHistory from './fastStorages/indices/messageHistory';
import sharedMediaIndex from './fastStorages/indices/sharedMediaIndex';
import listIndex from './fastStorages/indices/list';
import pollsIndex from './fastStorages/indices/pollsIndex';
import { getDatabase } from './persistentStorages/database';
import PersistentCache from './persistentCache';
// eslint-disable-next-line import/no-cycle
import { compareDialogs } from './accessors';

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
    polls: pollsIndex,
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
    recentFirst: orderBy(compareDialogs),

    /**
     * Pinned in folders (a.k.a. All and Archive). Warning: may contain ids of dialogs that aren't in the cache.
     * Debounce when you subscribe to the changes.
     */
    pinned: listIndex(true),
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

export const persistentCache = new PersistentCache(
  messageCache,
  userCache,
  chatCache,
  dialogCache,
);

/**
 * Debug
 */
if (process.env.NODE_ENV !== 'production') {
  Object.assign(window, {
    messageCache,
    chatCache,
    dialogCache,
    userCache,
    getDatabase,
  });
}
