import { Peer } from 'cache/types';
import { userCache, chatCache } from 'cache/repos';

export function arrayToMap<K extends keyof any, T extends { [key in K]: keyof any }>(items: T[], key: K): Record<T[K], T> {
  const map = {} as Record<T[K], T>;
  for (let i = 0; i < items.length; ++i) {
    map[items[i][key]] = items[i];
  }
  return map;
}

// Convert Peer to InputPeer
export function inputPeer(peer: Peer): any {
  switch (peer._) {
    case 'peerUser': {
      const user = userCache.get(peer.user_id);
      return { _: 'inputPeerUser', user_id: peer.user_id, access_hash: user.access_hash };
    }

    case 'peerChannel': {
      const channel = chatCache.get(peer.channel_id);
      return { _: 'inputPeerChannel', channel_id: peer.channel_id, access_hash: channel.access_hash };
    }

    case 'peerChat':
      return { _: 'inputPeerChat', chat_id: peer.chat_id };

    default:
      return { _: 'inputPeerEmpty' };
  }
}
