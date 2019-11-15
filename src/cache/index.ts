import { dialogToId } from 'helpers/api';
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
export const messageCache = new Collection<Message, {}, number>({
  getId: makeGetIdFromProp('id'),
});

/**
 * Dialog repo
 * Ref: https://core.telegram.org/type/dialog
 */
export const dialogCache = new Collection({
  getId: dialogToId,
  indices: {
    order: orderBy((dialog1: Dialog, dialog2: Dialog) => {
      // Pinned first
      if (dialog1.pinned !== dialog2.pinned) {
        return (dialog2.pinned ? 1 : 0) - (dialog1.pinned ? 1 : 0);
      }
      // If both are (not) pinned, with most recent message first
      return dialog2.top_message - dialog1.top_message;
    }),
  },
});
