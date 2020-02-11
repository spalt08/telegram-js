import { chatCache, userCache } from 'cache';
import { InputPeer, Message, Peer, FileLocation } from './types';

// Convert Peer to InputPeer
export function peerToInputPeer(peer: Peer, reference?: { peer: InputPeer, message: Message }): InputPeer {
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

export function peerToTitle(peer: Peer) {
  switch (peer._) {
    case 'peerUser': {
      const user = userCache.get(peer.user_id);
      if (user) return `${user.first_name} ${user.last_name}`;
      return 'Deleted Account';
    }

    case 'peerChat': {
      const chat = chatCache.get(peer.chat_id);
      if (chat) return chat.title;
      return 'Group';
    }

    case 'peerChannel': {
      const channel = chatCache.get(peer.channel_id);
      if (channel) return channel.title;
      return 'Channel';
    }

    default:
      return 'Unknown';
  }
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

function getFirstLetter(str: string) {
  if (!str) return '';
  for (let i = 0; i < str.length; i++) {
    if (str[i].toUpperCase() !== str[i].toLowerCase()) {
      return str[i];
    }
    if (str[i] >= '0' && str[i] <= '9') {
      return str[i];
    }
  }

  return '';
}

function getLetters(title: string) {
  if (!title) return '';
  if (title.length === 0) return '';

  const split = title.split(' ');
  if (split.length === 1) {
    return getFirstLetter(split[0]);
  }
  if (split.length > 1) {
    return getFirstLetter(split[0]) + getFirstLetter(split[1]);
  }

  return '';
}

export function peerToInitials(peer: Peer) {
  const title = peerToTitle(peer);
  return getLetters(title);
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
