import { Observable, of } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { chatCache, messageCache, userCache } from 'cache';
import { getFirstLetters } from 'helpers/data';
import {
  inputPeerToInputDialogPeer,
  inputPeerToPeer,
  messageToDialogPeer,
  peerMessageToId,
  peerToId,
  userIdToPeer,
} from 'helpers/api';
import { todoAssertHasValue } from 'helpers/other';
import {
  InputPeer,
  Message,
  Peer,
  FileLocation,
  User,
  Chat,
  InputUser,
  InputChannel,
  DialogFilter,
  Dialog, DialogPeer, InputDialogPeer,
} from 'mtproto-js';
import { ARCHIVE_FOLDER_ID } from '../const/api';

interface PeerReference {
  peer: InputPeer;
  message: Message;
}

// Convert Peer to InputPeer
export function peerToInputPeer(peer: Peer, reference?: PeerReference): InputPeer {
  switch (peer._) {
    case 'peerUser': {
      const user = userCache.get(peer.user_id);
      if (user?._ === 'user' && user.access_hash) {
        return { _: 'inputPeerUser', user_id: peer.user_id, access_hash: user.access_hash };
      }
      if (reference) {
        return { _: 'inputPeerUserFromMessage', peer: reference.peer, msg_id: reference.message.id, user_id: peer.user_id };
      }
      throw new Error('A reference is required to convert this Peer to InputPeer');
    }

    case 'peerChannel': {
      const chat = chatCache.get(peer.channel_id);
      if ((chat?._ === 'channel' || chat?._ === 'channelForbidden') && chat.access_hash) {
        return { _: 'inputPeerChannel', channel_id: peer.channel_id, access_hash: chat.access_hash };
      }
      if (reference) {
        return { _: 'inputPeerChannelFromMessage', peer: reference.peer, msg_id: reference.message.id, channel_id: peer.channel_id };
      }
      throw new Error('A reference is required to convert this Peer to InputPeer');
    }

    case 'peerChat':
      return { _: 'inputPeerChat', chat_id: peer.chat_id };

    default:
      return { _: 'inputPeerEmpty' };
  }
}

export function peerToInputUser(peer: Peer.peerUser, reference?: PeerReference): InputUser {
  const user = userCache.get(peer.user_id);
  if (user?._ === 'user' && user.access_hash) {
    return { _: 'inputUser', user_id: peer.user_id, access_hash: user.access_hash };
  }
  if (reference) {
    return { _: 'inputUserFromMessage', peer: reference.peer, msg_id: reference.message.id, user_id: peer.user_id };
  }
  throw new Error('A reference is required to convert this Peer to InputUser');
}

export function peerToInputChannel(peer: Peer.peerChannel, reference?: PeerReference): InputChannel {
  const channel = chatCache.get(peer.channel_id);
  if (channel?._ === 'channel' && channel.access_hash) {
    return { _: 'inputChannel', channel_id: peer.channel_id, access_hash: channel.access_hash };
  }
  if (reference) {
    return { _: 'inputChannelFromMessage', peer: reference.peer, msg_id: reference.message.id, channel_id: peer.channel_id };
  }
  throw new Error('A reference is required to convert this Peer to InputChannel');
}

export function messageSenderToInputUser(message: Exclude<Message, Message.messageEmpty>): InputUser {
  return {
    _: 'inputUserFromMessage',
    peer: peerToInputPeer(messageToDialogPeer(message)),
    msg_id: message.id,
    user_id: todoAssertHasValue(message.from_id),
  };
}

// Pass myUserId to return "Saved messages" for the currently authorized user
export function userToTitle(user: User | undefined, myUserId?: number) {
  if (!user || user._ === 'userEmpty') {
    return 'Someone';
  }
  if (user.deleted) {
    return 'Deleted Account';
  }
  if (myUserId && user.id === myUserId) {
    return 'Saved Messages';
  }
  return `${user.first_name || ''} ${user.last_name || ''}`;
}

export function chatToTitle(chat: Chat | undefined) {
  if (!chat || chat._ === 'chatEmpty' || !chat.title) {
    return chat?._ === 'chat' || chat?._ === 'chatForbidden' ? 'Unknown chat' : 'Unknown channel';
  }
  return chat.title;
}

// Pass myUserId to return "Saved messages" for the currently authorized user
export function peerToTitle(peer: Peer, myUserId?: number): [string, Observable<string>] {
  let currentValue: string;
  let valueObservable: Observable<string>;

  switch (peer._) {
    case 'peerUser':
      currentValue = userToTitle(userCache.get(peer.user_id), myUserId);
      valueObservable = new Observable((subscriber) => {
        subscriber.next(userToTitle(userCache.get(peer.user_id), myUserId));
        return userCache.watchItem(peer.user_id, (user) => subscriber.next(userToTitle(user, myUserId)));
      });
      break;

    case 'peerChat':
      currentValue = chatToTitle(chatCache.get(peer.chat_id));
      valueObservable = new Observable((subscriber) => {
        subscriber.next(chatToTitle(chatCache.get(peer.chat_id)));
        return chatCache.watchItem(peer.chat_id, (chat) => subscriber.next(chatToTitle(chat)));
      });
      break;

    case 'peerChannel':
      currentValue = chatToTitle(chatCache.get(peer.channel_id));
      valueObservable = new Observable((subscriber) => {
        subscriber.next(chatToTitle(chatCache.get(peer.channel_id)));
        return chatCache.watchItem(peer.channel_id, (chat) => subscriber.next(chatToTitle(chat)));
      });
      break;

    default:
      currentValue = 'Unknown peer';
      valueObservable = of(currentValue);
  }

  return [currentValue, valueObservable.pipe(distinctUntilChanged())];
}

export function getPeerPhotoLocation(peer: Peer, big?: boolean): FileLocation | null {
  switch (peer._) {
    case 'peerUser': {
      const user = userCache.get(peer.user_id);
      if (user?._ === 'user' && user.photo?._ === 'userProfilePhoto') {
        return big ? user.photo.photo_big : user.photo.photo_small;
      }
      return null;
    }

    case 'peerChat': {
      const chat = chatCache.get(peer.chat_id);
      if (chat?._ === 'chat' && chat.photo?._ === 'chatPhoto') {
        return big ? chat.photo.photo_big : chat.photo.photo_small;
      }
      return null;
    }

    case 'peerChannel': {
      const channel = chatCache.get(peer.channel_id);
      if (channel?._ === 'channel' && channel.photo?._ === 'chatPhoto') {
        return big ? channel.photo.photo_big : channel.photo.photo_small;
      }
      return null;
    }

    default:
      return null;
  }
}

export function peerToInitials(peer: Peer): [string, Observable<string>] {
  const [currentTitle, titleObservable] = peerToTitle(peer);
  return [
    getFirstLetters(currentTitle),
    titleObservable.pipe(
      map(getFirstLetters),
      distinctUntilChanged(),
    ),
  ];
}

export function textToColorCode(text: string) {
  return text && text.length > 0 ? (Math.abs(text.charCodeAt(0)) % 8) + 1 : 1;
}

export function idToColorCode(id: number) {
  return (Math.abs(id) % 8) + 1;
}

export function peerToColorCode(peer: Peer) {
  switch (peer._) {
    case 'peerUser': {
      return idToColorCode(peer.user_id);
    }

    case 'peerChat': {
      return idToColorCode(peer.chat_id);
    }

    case 'peerChannel': {
      return idToColorCode(peer.channel_id);
    }

    default:
      return 1;
  }
}

// todo: Handle messages sent by a channel in a chat: https://github.com/spalt08/telegram-js/issues/31
export function messageToSenderPeer(message: Exclude<Message, Message.messageEmpty>): Peer {
  const channel = message.to_id._ === 'peerChannel' ? chatCache.get(message.to_id.channel_id) : undefined;
  return channel && channel._ === 'channel' && !channel.megagroup
    ? message.to_id
    : userIdToPeer(todoAssertHasValue(message.from_id));
}

// See Array.prototype.sort
export function compareDialogs(dialog1: Readonly<Dialog>, dialog2: Readonly<Dialog>): number {
  // With most recent message first
  const message1 = messageCache.get(peerMessageToId(dialog1.peer, dialog1.top_message));
  const message2 = messageCache.get(peerMessageToId(dialog2.peer, dialog2.top_message));
  return (message2 && message2._ !== 'messageEmpty' ? message2.date : 0) - (message1 && message1._ !== 'messageEmpty' ? message1.date : 0);
}

export function makeDialogMatchFilterChecker(filter: Readonly<DialogFilter>) {
  const includePeers = new Set<string>();
  const excludePeers = new Set<string>();

  // A little trick to reduce GC work
  let peerId: string;
  let user: Readonly<User> | undefined;

  filter.include_peers.forEach((inputPeer) => {
    const peer = inputPeerToPeer(inputPeer);
    if (peer) {
      includePeers.add(peerToId(peer));
    }
  });

  filter.exclude_peers.forEach((inputPeer) => {
    const peer = inputPeerToPeer(inputPeer);
    if (peer) {
      excludePeers.add(peerToId(peer));
    }
  });

  return (dialog: Dialog): boolean => {
    if (dialog._ !== 'dialog') {
      return false;
    }
    if (filter.exclude_archived && dialog.folder_id === ARCHIVE_FOLDER_ID) {
      return false;
    }
    if (filter.exclude_muted && dialog.notify_settings.silent) {
      return false;
    }
    if (filter.exclude_read && (dialog.unread_count || dialog.unread_mark)) {
      return false;
    }
    peerId = peerToId(dialog.peer);
    if (excludePeers.has(peerId)) {
      return false;
    }
    if (includePeers.has(peerId)) {
      return true;
    }
    switch (dialog.peer._) {
      case 'peerChannel':
        if (filter.broadcasts) {
          return true;
        }
        break;
      case 'peerChat':
        if (filter.groups) {
          return true;
        }
        break;
      case 'peerUser':
        user = userCache.get(dialog.peer.user_id);
        if (user?._ === 'user') {
          if (filter.contacts && user.contact) {
            return true;
          }
          if (filter.non_contacts && !user.contact && !user.bot) {
            return true;
          }
          if (filter.bots && user.bot) {
            return true;
          }
        }
        break;
      default:
    }
    return false;
  };
}

export function dialogPeerToInputDialogPeer(dialogPeer: DialogPeer): InputDialogPeer {
  if (dialogPeer._ === 'dialogPeer') {
    return inputPeerToInputDialogPeer(peerToInputPeer(dialogPeer.peer));
  }
  return {
    _: 'inputDialogPeerFolder',
    folder_id: dialogPeer.folder_id,
  };
}
