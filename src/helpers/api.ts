import { InputPeer, Message, Peer } from 'cache/types';
import { chatCache, userCache } from 'cache/repos';

// Convert Peer to InputPeer
export function inputPeer(peer: Peer, reference?: { peer: InputPeer, message: Message }): InputPeer {
  switch (peer._) {
    case 'peerUser': {
      const user = userCache.get(peer.user_id);
      if (user.access_hash) {
        return { _: 'inputPeerUser', user_id: peer.user_id, access_hash: user.access_hash };
      }
      if (reference) {
        return { _: 'inputUserFromMessage', peer: reference.peer, msg_id: reference.message.id, user_id: peer.user_id };
      }
      throw new Error('A reference is required to convert this Peer to InputPeer');
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

// Conver Peer to unique key
export function peerToKey(peer: Peer): string {
  switch (peer._) {
    case 'peerUser': return `user${peer.user_id}`;
    case 'peerChannel': return `channel${peer.channel_id}`;
    case 'peerChat': return `chat${peer.chat_id}`;
    default: throw new Error('Unknown peer');
  }
}
