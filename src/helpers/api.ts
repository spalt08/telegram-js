import { Dialog, Peer } from 'cache/types';

export function peerToId(peer: Peer) {
  switch (peer._) {
    case 'peerChannel': return `channel_${peer.channel_id}`;
    case 'peerChat': return `chat_${peer.chat_id}`;
    case 'peerUser': return `user_${peer.user_id}`;
    default: throw TypeError('Unknown peer type');
  }
}

export function dialogToId(dialog: Dialog) {
  return peerToId(dialog.peer);
}
