import { Dialog, Peer, Message, Updates } from 'mtproto-js';
import { ARCHIVE_FOLDER_ID, ROOT_FOLDER_ID } from 'const/api';
import { todoAssertHasValue } from './other';

export function peerToId(peer: Peer): string {
  switch (peer._) {
    case 'peerChannel': return `channel_${peer.channel_id}`;
    case 'peerChat': return `chat_${peer.chat_id}`;
    case 'peerUser': return `user_${peer.user_id}`;
    default: throw TypeError('Unknown peer type');
  }
}

export function dialogPeerToDialogId(peer: Peer) {
  return peerToId(peer);
}

export function dialogToId(dialog: Readonly<Dialog>): string {
  if (dialog._ === 'dialogFolder') {
    return `folder_${dialog.folder.id}`;
  }
  return dialogPeerToDialogId(dialog.peer);
}

// Use it to convert a user message id to the message cache key
export function getUserMessageId(messageId: number): string {
  return `users_${messageId}`;
}

export function peerMessageToId(peer: Peer, messageId: number): string {
  if (peer._ === 'peerUser' || peer._ === 'peerChat') {
    // All the dialogs with user share a single messages counter
    return getUserMessageId(messageId);
  }
  return `${peerToId(peer)}_${messageId}`;
}

export function messageToDialogPeer(message: Readonly<Exclude<Message, Message.messageEmpty>>): Peer;
export function messageToDialogPeer(message: Readonly<Message.messageEmpty>): undefined;
export function messageToDialogPeer(message: Readonly<Message>): Peer | undefined;
export function messageToDialogPeer(message: Readonly<Message>): Peer | undefined {
  if (message._ === 'messageEmpty') return undefined;
  if (message.to_id._ === 'peerUser' && !message.out) return { _: 'peerUser', user_id: todoAssertHasValue(message.from_id) };
  return message.to_id;
}

export function messageToId(message: Readonly<Message>): string {
  if (message._ === 'messageEmpty') return `deleted_${message.id}`;
  return peerMessageToId(messageToDialogPeer(message), message.id);
}

export function messageIdToId(messageId: string) {
  const dividerPosition = messageId.lastIndexOf('_');
  return Number(messageId.slice(dividerPosition + 1));
}

/**
 * @return
 * <0 The first message is older than the second
 * =0 Messages are the same
 * >0 The first message is newer than the second
 */
export function compareSamePeerMessageIds(id1: string, id2: string): number {
  if (id1 === id2) {
    return 0;
  }
  if (id1.length !== id2.length) {
    return id1.length - id2.length;
  }
  return id1 < id2 ? -1 : 1;
}

export function userIdToPeer(id: number): Peer {
  return { _: 'peerUser', user_id: id };
}

export function shortMessageToMessage(self: number, message: Updates.updateShortMessage): Message {
  return {
    ...message,
    _: 'message',
    from_id: message.out ? self : message.user_id,
    to_id: {
      _: 'peerUser',
      user_id: message.user_id,
    },
    media: { _: 'messageMediaEmpty' },
    entities: [],
  };
}

export function shortChatMessageToMessage(message: Updates.updateShortChatMessage): Message {
  const peer: Peer = {
    _: 'peerChat',
    chat_id: message.chat_id,
  };

  return {
    ...message,
    _: 'message',
    to_id: peer,
    media: { _: 'messageMediaEmpty' },
  };
}

export function isDialogInRootFolder(dialog: Dialog) {
  return dialog._ === 'dialogFolder' || dialog.folder_id === ROOT_FOLDER_ID;
}

export function isDialogArchived(dialog: Dialog) {
  return dialog._ !== 'dialogFolder' && dialog.folder_id === ARCHIVE_FOLDER_ID;
}

export function getDialogLastReadMessageId(dialog: Dialog.dialog) {
  // Not perfect but suitable for most cases
  return dialog.unread_count > 0 ? dialog.read_inbox_max_id : dialog.top_message;
}

export function arePeersSame(peer1: Peer | null | undefined, peer2: Peer | null | undefined) {
  return (!!peer1 && peerToId(peer1)) === (!!peer2 && peerToId(peer2));
}
