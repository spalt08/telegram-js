import { Observable, of } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { chatCache, userCache } from 'cache';
import { getFirstLetters } from 'helpers/data';
import { messageToDialogPeer } from 'helpers/api';
import { InputPeer, Message, Peer, FileLocation, User, Chat, MessageEmpty, InputUser, InputDialogPeer } from './types';

interface PeerReference {
  peer: InputPeer;
  message: Message;
}

// Convert Peer to InputPeer
export function peerToInputPeer(peer: Peer, reference?: PeerReference): InputPeer {
  switch (peer._) {
    case 'peerUser': {
      const user = userCache.get(peer.user_id);
      if (user && user.access_hash) {
        return { _: 'inputPeerUser', user_id: peer.user_id, access_hash: user.access_hash };
      }
      if (reference) {
        return { _: 'inputPeerUserFromMessage', peer: reference.peer, msg_id: reference.message.id, user_id: peer.user_id };
      }
      throw new Error('A reference is required to convert this Peer to InputPeer');
    }

    case 'peerChannel': {
      const chat = chatCache.get(peer.channel_id);
      if (chat?._ === 'channel') {
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

export function messageSenderToInputUser(message: Exclude<Message, MessageEmpty>): InputUser {
  return {
    _: 'inputUserFromMessage',
    peer: peerToInputPeer(messageToDialogPeer(message)),
    msg_id: message.id,
    user_id: message.from_id,
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
  if (!user) {
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
  if (!chat) {
    return 'Unknown chat';
  }
  return chat.title;
}

export function channelToTitle(channel: Chat | undefined) {
  if (!channel) {
    return 'Unknown channel';
  }
  return channel.title;
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
      currentValue = channelToTitle(chatCache.get(peer.channel_id));
      valueObservable = new Observable((subscriber) => {
        subscriber.next(channelToTitle(chatCache.get(peer.channel_id)));
        return chatCache.watchItem(peer.channel_id, (chat) => subscriber.next(channelToTitle(chat)));
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
      if (user && user.photo && user.photo._ === 'userProfilePhoto') {
        return big ? user.photo.photo_big : user.photo.photo_small;
      }
      return null;
    }

    case 'peerChat': {
      const chat = chatCache.get(peer.chat_id);
      if (chat && chat.photo && chat.photo._ === 'chatPhoto') {
        return big ? chat.photo.photo_big : chat.photo.photo_small;
      }
      return null;
    }

    case 'peerChannel': {
      const channel = chatCache.get(peer.channel_id);
      if (channel && channel.photo && channel.photo._ === 'chatPhoto') {
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
