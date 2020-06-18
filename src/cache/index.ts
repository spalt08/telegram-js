import { dialogToId, messageToId, peerToId } from 'helpers/api';
import { Chat, Dialog, Message, User, UserFull, ChatFull, StickerSet } from 'mtproto-js';
import { considerMinItemMerger } from './fastStorages/dictionary';
import Collection, { GetId, makeGetIdFromProp } from './fastStorages/collection';
import orderBy from './fastStorages/indices/orderBy';
import messageHistory from './fastStorages/indices/messageHistory';
import listIndex from './fastStorages/indices/list';
import pollsIndex from './fastStorages/indices/pollsIndex';
import { getDatabase } from './persistentStorages/database';
import PersistentCache from './persistentCache';
// eslint-disable-next-line import/no-cycle
import { compareDialogs } from './accessors';
import stickerSetStickersIndex from './fastStorages/indices/stickerSetStickersIndex';
import usernameIndex from './fastStorages/indices/usernameIndex';

/**
 * User repo
 * Ref: https://core.telegram.org/constructor/user
 */
export const userCache = new Collection({
  getId: makeGetIdFromProp('id') as GetId<User, number>,
  itemMerger: considerMinItemMerger,
  indices: {
    usernames: usernameIndex,
  },
});

/**
 * Chat repo
 * Ref: https://core.telegram.org/constructor/chat
 */
export const chatCache = new Collection({
  getId: makeGetIdFromProp('id') as GetId<Chat, number>,
  itemMerger(chat1, chat2) {
    const result = considerMinItemMerger<Chat>(chat1, chat2);
    // Sometimes server returns channel objects with participants_count value wrongly equal to 0 (for example, in _='messages. ' responses)
    // This is a workaround to not loose the participants information
    if (
      chat1._ === 'channel' && chat1.participants_count !== undefined
      && result._ === 'channel' && result.participants_count === undefined
    ) {
      return { ...result, participants_count: chat1.participants_count };
    }
    return result;
  },
  indices: {
    usernames: usernameIndex,
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
    photoVideosHistory: messageHistory,
    documentsHistory: messageHistory,
    linksHistory: messageHistory,
    voiceHistory: messageHistory,
    musicHistory: messageHistory,
    polls: pollsIndex,
  },
});

/**
 * Dialog repo
 * Ref: https://core.telegram.org/type/dialog
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

export const stickerSetCache = new Collection({
  getId: (set: StickerSet) => set.id,
  indices: {
    stickers: stickerSetStickersIndex,
    saved: orderBy<StickerSet>(
      (m1, m2) => m1.id === 'recent' ? 0 : m2.installed_date! - m1.installed_date!,
      (set) => set.installed_date !== undefined,
    ),
  },
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
