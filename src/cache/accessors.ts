import { chatCache, userCache } from 'cache';
import { InputPeer, Message, Peer } from './types';

// Convert Peer to InputPeer
// eslint-disable-next-line import/prefer-default-export
export function peerToInputPeer(peer: Peer, reference?: { peer: InputPeer, message: Message }): InputPeer {
  switch (peer._) {
    case 'peerUser': {
      const user = userCache.get(peer.user_id);
      if (user && user.access_hash) {
        return { _: 'inputPeerUser', user_id: peer.user_id, access_hash: user.access_hash };
      }
      if (reference) {
        return { _: 'inputUserFromMessage', peer: reference.peer, msg_id: reference.message.id, user_id: peer.user_id };
      }
      throw new Error('A reference is required to convert this Peer to InputPeer');
    }

    case 'peerChannel': {
      const channel = chatCache.get(peer.channel_id);
      if (channel) {
        return { _: 'inputPeerChannel', channel_id: peer.channel_id, access_hash: channel.access_hash };
      }
      if (reference) {
        return { _: 'inputChannelFromMessage', peer: reference.peer, msg_id: reference.message.id, channel_id: peer.channel_id };
      }
      throw new Error('A reference is required to convert this Peer to InputPeer');
    }

    case 'peerChat':
      return { _: 'inputPeerChat', chat_id: peer.chat_id };

    default:
      return { _: 'inputPeerEmpty' };
  }
}
