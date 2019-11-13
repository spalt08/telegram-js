/**
 * Peer Reference
 * Ref: https://core.telegram.org/type/Peer
 */
export type Peer = {
  _: string,
  user_id: number,
  channel_id: number,
  chat_id: number,
};

/**
 * Peer Reference
 * Ref: https://core.telegram.org/type/InputPeer
 */
export type InputPeer = {
  _: string,
  user_id?: number,
  channel_id?: number,
  chat_id?: number,
  access_hash?: string,
};

/**
 * Dialog data
 * Ref: https://core.telegram.org/type/dialog
 */
export type Dialog = {
  peer: Peer,
  pinned: boolean,
  top_message: number,
  unread_count: number,
  unread_mark: boolean,
  unread_mentions_count: number,
};

/**
 * User object
 * Ref: https://core.telegram.org/constructor/user
 */
export type User = {
  id: number,
  first_name: string,
  last_name: string,
  access_hash: string,
  photo: Object,
};

/**
 * Chat object
 * Ref: https://core.telegram.org/constructor/chat
 */
export type Chat = {
  id: number,
  title: string,
  access_hash: string,
  photo: Object,
};

/**
 * Message object
 * Ref: https://core.telegram.org/constructor/message
 */
export type Message = {
  id: number,
  from_id: number,
  message: string,
  date: number,
};
