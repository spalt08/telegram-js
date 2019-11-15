import { Dialog, Peer, Message, AnyShortMessage } from 'cache/types';

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

export function peerMessageToId(peer: Peer, id: number) {
  return `${peerToId(peer)}_${id}`;
}

export function messageToId(message: Message) {
  if (message._ === 'messageEmpty') return `deleted_${message.id}`;
  if (message.to_id._ === 'peerUser' && message.out === false) return `user_${message.from_id}_${message.id}`;
  return peerMessageToId(message.to_id, message.id);
}

export function userIdToPeer(id: number): Peer {
  return { _: 'peerUser', user_id: id };
}

export function shortMessageToMessage(self: number, message: AnyShortMessage): Message {
  return {
    ...message,
    _: 'message',
    from_id: message.out ? self : message.user_id,
    to_id: {
      _: 'peerUser',
      user_id: message.user_id,
    },
    media: { _: 'messageMediaEmpty' },
  };
}
