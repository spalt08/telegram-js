import { Observable, of } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { chatCache, userCache } from 'cache';
import { getFirstLetters } from 'helpers/data';
import { messageToDialogPeer, userIdToPeer } from 'helpers/api';
import { todoAssertHasValue } from 'helpers/other';
import { InputPeer, Message, Peer, FileLocation, User, Chat, InputUser, InputDialogPeer, InputChannel } from 'mtproto-js';

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

export function peerToInputDialogPeer(peer: Peer, reference?: PeerReference): InputDialogPeer {
  return {
    _: 'inputDialogPeer',
    peer: peerToInputPeer(peer, reference),
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
  return `${user.first_name} ${user.last_name}`;
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
