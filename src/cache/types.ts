import { BigInteger } from 'big-integer';

/**
 * Transform a type with required fields to type with `min` property with the corresponding meaning
 * Ref: https://core.telegram.org/api/min
 */
export type WithMin<T> = { id: number } & ({ min: false } & T | { min: true } & Partial<T>);

/**
 * Peer Reference
 * Ref: https://core.telegram.org/type/Peer
 */
export type Peer = {
  _: 'peerUser',
  user_id: number,
} | {
  _: 'peerChat',
  chat_id: number,
} | {
  _: 'peerChannel',
  channel_id: number,
};

/**
 * Peer Reference
 * Ref: https://core.telegram.org/type/InputPeer
 */
export type InputPeer = {
  _: 'inputPeerEmpty',
} | {
  _: 'inputPeerUser',
  user_id: number,
  access_hash: string,
} | {
  _: 'inputPeerChannel',
  channel_id: number,
  access_hash: string,
} | {
  _: 'inputPeerChat',
  chat_id: number,
} | {
  _: 'inputUserFromMessage',
  peer: InputPeer,
  msg_id: number,
  user_id: number,
} | {
  _: 'inputChannelFromMessage',
  peer: InputPeer,
  msg_id: number,
  channel_id: number,
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
  notify_settings: {
    _: 'peerNotifySettings',
    silent: boolean,
    mute_until: number,
  }
};

/**
 * User object
 * Ref: https://core.telegram.org/constructor/user
 */
export type User = WithMin<{
  first_name: string,
  last_name: string,
  access_hash: string,
  photo: UserProfilePhoto,
}>;

/**
 * User photo object
 * Ref: https://core.telegram.org/type/UserProfilePhoto
 */
export type UserProfilePhoto = {
  _: 'userProfilePhotoEmpty',
} | {
  _: 'userProfilePhoto',
  photo_small: FileLocation,
  photo_big: FileLocation,
  dc_id: number,
};

/**
 * Chat object
 * Ref: https://core.telegram.org/constructor/chat
 */
export type Chat = {
  id: number,
  title: string,
  access_hash: string,
  photo: ChatPhoto,
};

/**
 * Chat photo object
 * Ref: https://core.telegram.org/type/ChatPhoto
 */
export type ChatPhoto = {
  _: 'chatPhotoEmpty',
} | {
  _: 'chatPhoto',
  photo_small: FileLocation,
  photo_big: FileLocation,
  dc_id: number,
};

/**
 * Channel object
 * Ref: https://core.telegram.org/constructor/channel
 */
export type Channel = WithMin<{
  title: string,
  photo: ChatPhoto,
}>;

export type MessageMedia = {
  _: 'messageMediaEmpty',
} | {
  _: 'messageMediaPhoto',
  photo: Photo,
} | {
  _: 'messageMediaGeo',
} | {
  _: 'messageMediaContact',
} | {
  _: 'messageMediaDocument',
} | {
  _: 'messageMediaWebPage',
} | {
  _: 'messageMediaGeoLive',
} | {
  _: 'messageMediaPoll',
};

/**
 * Photo object
 * Ref: https://core.telegram.org/type/Photo
 */
export type Photo = {
  _: 'photo',
  has_stickers: boolean,
  access_hash: BigInteger,
  file_reference: string,
  dc_id: number,
  sizes: PhotoSize[],
} | {
  _: 'photoEmpty',
};

/**
 * PhotoSize object
 * Ref: https://core.telegram.org/type/PhotoSize
 */
export type PhotoSize = {
  _: 'photoSizeEmpty',
} | {
  _: 'photoSize',
  type: string,
  location: FileLocation,
  w: number,
  h: number,
  size: number,
} | {
  _: 'photoStrippedSize',
  type: string,
  bytes: string,
};

/**
 * Message object
 * Ref: https://core.telegram.org/type/Message
 */
export type Message = {
  _: 'message',
  id: number,
  from_id: number,
  message: string,
  date: number,
  to_id: Peer,
  media: MessageMedia,
} | {
  _: 'messageEmpty',
  id: number,
} | MessageService;

export type MessageService = {
  _: 'messageService',
  action: MessageAction,
  id: number,
  from_id: number,
};

/**
 * Message action
 * Ref: https://core.telegram.org/type/MessageAction
 */
export type MessageAction = {
  _: 'messageActionChatCreate',
  title: string,
  users: number[],
};

/**
 * File location object
 * Ref: https://core.telegram.org/type/FileLocation
 */
export type FileLocation = {
  volume_id: number,
  local_id: number,
};
