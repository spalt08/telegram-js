import { InputPeer, Peer } from 'cache/types';
import { chatCache, userCache } from 'cache/repos';

// Convert Peer to InputPeer
// eslint-disable-next-line import/prefer-default-export
export function inputPeer(peer: Peer): InputPeer {
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
