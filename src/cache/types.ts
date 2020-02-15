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
  _: 'inputPeerUserFromMessage',
  peer: InputPeer,
  msg_id: number,
  user_id: number,
} | {
  _: 'inputPeerChannelFromMessage',
  peer: InputPeer,
  msg_id: number,
  channel_id: number,
};

/**
 * Peer Reference
 * Ref: https://core.telegram.org/type/InputUser
 */
export type InputUser = {
  _: 'inputUserEmpty' | 'inputUserSelf',
} | {
  _: 'inputUser',
  user_id: number,
  access_hash: string,
} | {
  _: 'inputUserFromMessage',
  peer: InputPeer, // message peer
  msg_id: number,
  user_id: number,
};

/**
 * Input channel data
 * Ref: https://core.telegram.org/type/InputChannel
 */
export type InputChannel = {
  _: 'inputChannel',
  channel_id: number,
  access_hash: string,
} | {
  _: 'inputChannelEmpty',
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
  read_inbox_max_id: number,
  read_outbox_max_id: number,
  notify_settings: {
    _: 'peerNotifySettings',
    silent: boolean,
    mute_until: number,
  },
  folder_id: number,
};

/**
 * User object
 * Ref: https://core.telegram.org/constructor/user
 */
export type User = WithMin<{
  first_name: string,
  last_name: string,
  username: string,
  phone: string,
  access_hash: string,
  photo: UserProfilePhoto,
  status: UserStatus,
  deleted: boolean,
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
 * User status object
 * Ref: https://core.telegram.org/type/UserStatus
 */
export type UserStatus = {
  _: 'userStatusEmpty',
} | {
  _: 'userStatusOnline',
  expires: number,
} | {
  _: 'userStatusOffline',
  was_online: number,
} | {
  _: 'userStatusRecently',
} | {
  _: 'userStatusLastWeek',
} | {
  _: 'userStatusLastMonth',
};

/**
 * Full user information
 * Ref: https://core.telegram.org/constructor/userFull
 */
export type UserFull = {
  user: User,
  about: string,
  pinned_msg_id: number,
};

export type UpdateUserTyping = {
  _: 'updateUserTyping',
  user_id: number,
  action: SendMessageAction,
};

export type UpdateChatUserTyping = {
  _: 'updateChatUserTyping',
  chat_id: number,
  user_id: number,
  action: SendMessageAction,
};

export type SendMessageAction = {
  _: 'sendMessageTypingAction' | 'sendMessageCancelAction' | 'sendMessageRecordVideoAction' | 'sendMessageUploadVideoAction'
  | 'sendMessageRecordAudioAction' | 'sendMessageUploadAudioAction' | 'sendMessageUploadPhotoAction' | 'sendMessageUploadDocumentAction'
  | 'sendMessageGeoLocationAction' | 'sendMessageChooseContactAction' | 'sendMessageGamePlayAction' | 'sendMessageRecordRoundAction'
  | 'sendMessageUploadRoundAction'
};

/**
 * Chat object
 * Ref: https://core.telegram.org/constructor/chat
 */
export type Chat = {
  _: 'chat'
  id: number,
  title: string,
  photo: ChatPhoto,
  migrated_to?: InputChannel,
  participants_count: number,
} | {
  _: 'channel',
  id: number,
  title: string,
  broadcast: boolean,
  access_hash: string,
  username: string,
  photo: ChatPhoto,
  migrated_to?: InputChannel,
  megagroup: boolean,
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
 * Ref: https://core.telegram.org/constructor/messages.chatFull
 */
export type MessagesChatFull = {
  full_chat: ChatFull,
  chats: Chat[],
  users: User[]
};

/**
 * Chat full info
 * Ref: https://core.telegram.org/constructor/chatFull
 */
export type ChatFull = {
  _: 'chatFull',
  id: number,
  about: string,
  pinned_msg_id: number,
} | {
  _: 'channelFull',
  id: number,
  about: string,
  pinned_msg_id: number,
  participants_count: number,
  online_count: number,
};

export type WebPage = {
  _: 'webPageEmpty',
} | {
  _: 'webPagePending',
} | {
  _: 'webPage',
  type?: string,
  site_name?: string,
  title?: string,
  description?: string,
  photo: Photo,
};

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
  document: Document,
} | {
  _: 'messageMediaWebPage',
  webpage: WebPage,
} | {
  _: 'messageMediaGeoLive',
} | {
  _: 'messageMediaPoll',
};

/**
 * MessageEntity object
 * Ref: https://core.telegram.org/type/MessageEntity
 */
export type MessageEntity = ({
  _: 'messageEntityUnknown' | 'messageEntityMention' | 'messageEntityHashtag' | 'messageEntityBotCommand'
  | 'messageEntityUrl' | 'messageEntityEmail' | 'messageEntityBold' | 'messageEntityItalic' | 'messageEntityCode'
  | 'messageEntityPre';
} | {
  _: 'messageEntityTextUrl',
  url: string,
} | {
  _: 'messageEntityMentionName',
  user_id: number,
} | {
  _: 'messageEntityPhone' | 'messageEntityCashtag' | 'messageEntityUnderline' | 'messageEntityStrike' | 'messageEntityBlockquote',
}) & {
  offset: number,
  length: number,
};

export type Document = {
  _: 'document',
  id: any,
  access_hash: any,
  file_reference: string,
  mime_type: string,
  thumbs: PhotoSize[],
  dc_id: number,
  attributes: DocumentAttribute[],
  size: number,
};

/**
 * Photo object
 * Ref: https://core.telegram.org/type/Photo
 */
export type Photo = PhotoNotEmpty | { _: 'photoEmpty' };
export type PhotoNotEmpty = {
  _: 'photo',
  id: any,
  has_stickers: boolean,
  access_hash: any,
  file_reference: string,
  dc_id: number,
  sizes: PhotoSize[],
};

/**
 * PhotoSize object
 * Ref: https://core.telegram.org/type/PhotoSize
 */
export type PhotoSizeWithLocation = {
  _: 'photoSize',
  type: string,
  location: FileLocation,
  w: number,
  h: number,
  size: number,
};

export type PhotoSize = {
  _: 'photoSizeEmpty',
} | PhotoSizeWithLocation | {
  _: 'photoStrippedSize',
  type: string,
  bytes: string,
} | {
  _: 'photoCachedSize',
  type: string,
  bytes: string,
  w: number,
  h: number,
};

/**
 * Ref: https://core.telegram.org/type/KeyboardButton
 */
export type KeyboardButton = {
  _: 'keyboardButton',
  text: string,
};

/**
 * Ref: https://core.telegram.org/type/KeyboardButtonRow
 */
export type KeyboardButtonRow = {
  _: 'keyboardButtonRow',
  buttons: KeyboardButton[],
};

/**
 * Ref: https://core.telegram.org/constructor/replyInlineMarkup
 */
export type ReplyInlineMarkup = {
  _: 'replyInlineMarkup',
  rows: KeyboardButtonRow[],
};

export type ReplyKeyboardMarkup = {
  _: 'replyKeyboardMarkup',
  rows: KeyboardButtonRow[],
};

/**
 * Reply markup
 * Ref: https://core.telegram.org/type/ReplyMarkup
 */
export type ReplyMarkup = ReplyInlineMarkup | ReplyKeyboardMarkup | {
  _: 'replyKeyboardForceReply',
} | {
  _: 'replyKeyboardForceReply',
};

/**
 * Message object
 * Ref: https://core.telegram.org/type/Message
 */
export type Message = MessageCommon | MessageService | MessageEmpty;

export type MessageCommon = {
  _: 'message',
  out: boolean,
  id: number,
  from_id: number,
  message: string,
  date: number,
  to_id: Peer,
  media: MessageMedia,
  reply_to_msg_id?: number,
  entities: MessageEntity[],
  reply_markup?: ReplyMarkup,
};

export type MessageService = {
  _: 'messageService',
  action: MessageAction,
  out: boolean,
  id: number,
  from_id: number,
  date: number,
  to_id: Peer,
};

export type MessageEmpty = {
  _: 'messageEmpty',
  id: number,
};

/**
 * Short messages
 * Refs:
 * - https://core.telegram.org/constructor/updateShortMessage
 */
export type AnyUpdateShortMessage = {
  _: 'updateShortMessage', // -> MessageCommon { peerUser }
  user_id: number,
  message: string
  date: number,
  id: number,
  out: boolean,
};

/**
 * Update messages
 * Refs:
 * - https://core.telegram.org/type/update
 */
export type AnyUpdateMessage = {
  _: 'updateNewMessage' | 'updateNewChannelMessage',
  message: Message,
};

/**
 * Message action
 * Ref: https://core.telegram.org/type/MessageAction
 */
export type MessageAction = {
  _: 'messageActionChatCreate',
  title: string,
  users: number[],
} | {
  _: 'messageActionChatEditTitle',
  title: string,
} | {
  _: 'messageActionChatEditPhoto',
  photo: Photo,
} | {
  _: 'messageActionChatDeletePhoto',
} | {
  _: 'messageActionChatAddUser',
  users: number[],
} | {
  _: 'messageActionChatDeleteUser',
  user_id: number,
} | {
  _: 'messageActionChatJoinedByLink',
  inviter_id: number,
} | {
  _: 'messageActionChannelCreate',
  title: string,
} | {
  _: 'messageActionChatMigrateTo',
} | {
  _: 'messageActionChannelMigrateFrom',
  title: string,
  chat_id: number,
} | {
  _: 'messageActionPinMessage',
} | {
  _: 'messageActionPhoneCall',
} | {
  _: 'messageActionCustomAction',
  message: string,
} | {
  _: 'messageActionScreenshotTaken',
} | {
  _: 'messageActionContactSignUp',
};

/**
 * File location object
 * Ref: https://core.telegram.org/type/FileLocation
 */
export type FileLocation = {
  volume_id: string,
  local_id: number,
};

export type InputStickerSet = {
  _: 'inputStickerSetID',
  id: string,
  access_hash: string,
};

/**
 * Input File location object
 * Ref: https://core.telegram.org/type/InputFileLocation
 */
export type InputFileLocation = {
  _: 'inputPhotoFileLocation' | 'inputDocumentFileLocation',
  id: any,
  access_hash: any,
  file_reference: string,
  thumb_size: string,
} | {
  _: 'inputPeerPhotoFileLocation',
  peer: InputPeer,
  volume_id: string,
  local_id: number,
} | {
  _: 'inputStickerSetThumb',
  stickerset: InputStickerSet,
  volume_id: string,
  local_id: number,
};

/**
 * Ref: https://core.telegram.org/type/storage.FileType
 */
export type StorageFileType = {
  _: 'storage.filePartial',
} | {
  _: 'storage.fileJpeg',
} | {
  _: 'storage.filePng',
};

/**
 * Ref: https://core.telegram.org/constructor/upload.file
 */
export type UploadFile = {
  _: 'upload.file',
  type: StorageFileType,
  mtime: number,
  bytes: string,
};

/**
 * Ref: https://core.telegram.org/constructor/documentAttributeSticker
 */
export type DocumentAttributeSticker = {
  _: 'documentAttributeSticker',
  alt: string,
  stickerset: InputStickerSet,
};

/**
 * Ref: https://core.telegram.org/constructor/documentAttributeVideo
 */
export type DocumentAttributeVideo = {
  _: 'documentAttributeVideo',
  round_message?: boolean,
  supports_streaming?: boolean,
  duration: number,
  w: number,
  h: number,
};


/**
 * Ref: https://core.telegram.org/constructor/documentAttributeFilename
 */
export type DocumentAttributeFilename = {
  _: 'documentAttributeFilename',
  file_name: string,
};

/**
 * Ref: https://core.telegram.org/constructor/documentAttributeAnimated
 */
export type DocumentAttributeAnimated = {
  _: 'documentAttributeAnimated',
};

/**
 * Ref: https://core.telegram.org/type/DocumentAttribute
 */
export type DocumentAttribute = DocumentAttributeSticker | DocumentAttributeFilename | DocumentAttributeVideo | DocumentAttributeAnimated;

/**
 * Ref: https://core.telegram.org/type/MessagesFilter
 */
export type MessageFilter = {
  _: 'inputMessagesFilterEmpty' | 'inputMessagesFilterPhotos' | 'inputMessagesFilterVideo'
  | 'inputMessagesFilterPhotoVideo' | 'inputMessagesFilterDocument' | 'inputMessagesFilterUrl'
  | 'inputMessagesFilterGif' | 'inputMessagesFilterVoice' | 'inputMessagesFilterMusic' | 'inputMessagesFilterChatPhotos'
  | 'inputMessagesFilterRoundVoice' | 'inputMessagesFilterRoundVideo' | 'inputMessagesFilterMyMentions'
  | 'inputMessagesFilterGeo' | 'inputMessagesFilterContacts';
} | {
  _: 'inputMessagesFilterPhoneCalls';
  missed: boolean;
};

/**
 * Ref: https://core.telegram.org/constructor/messages.messagesNotModified
 */
export type MessagesNotModified = {
  _: 'messages.messagesNotModified',
  count: number,
};

/**
 * Ref: https://core.telegram.org/type/messages.Messages
 */
export type Messages = ({
  // You get it when the whole messages list fits to the single response
  _: 'messages.messages',
} | {
  // You get it when there are more messages to paginate
  _: 'messages.messagesSlice',
  inexact: boolean,
  count: number, // Total number of messages in all the slices
  next_rate?: number,
} | {
  _: 'messages.channelMessages',
  inexact: boolean,
  pts: number,
  count: number, // Total number of messages on all the pages
}) & {
  messages: Message[],
  chats: Chat[],
  users: User[],
} | MessagesNotModified;

/**
 * Ref: https://core.telegram.org/type/InputFile
 */
export type InputFile = {
  _: 'inputFile',
  id: string,
  parts: number,
  name: string,
  md5_checksum: string,
} | {
  _: 'inputFileBig',
  id: string,
  parts: number,
  name: string,
};

/**
 * Ref: https://core.telegram.org/constructor/stickerSet
 */
export type StickerSet = {
  _: 'stickerSet',
  installed_date: number,
  id: string,
  animated: boolean,
  access_hash: string,
  title: string,
  thumb?: PhotoSize,
  thumb_dc_id?: number,
  count: number,
  hash: number,
};

/**
 * Ref: https://core.telegram.org/constructor/updateReadHistoryInbox
 */
export type UpdateReadHistoryInbox = {
  _: 'updateReadHistoryInbox',
  peer: Peer,
  max_id: number,
  still_unread_count: number,
};

/**
 * Ref: https://core.telegram.org/constructor/updateReadHistoryInbox
 */
export type UpdateReadChannelInbox = {
  _: 'updateReadChannelInbox',
  channel_id: number,
  max_id: number,
  still_unread_count: number,
};
