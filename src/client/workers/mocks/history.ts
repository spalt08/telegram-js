import { InputPeer, Message, Peer } from 'mtproto-js';
import { mockMessage } from './message';
import { users, me } from './user';

const dateCounters: Record<string, number> = {};
const histories: Record<string, Message[]> = {};
const MAX_HISTORY_LIMIT = 500;

function peerToId(peer: InputPeer): string {
  switch (peer._) {
    case 'inputPeerChat': return `chat_${peer.chat_id}`;
    case 'inputPeerUser': return `user_${peer.user_id}`;
    default: throw TypeError('Unknown peer type');
  }
}
function peerToPeer(peer: InputPeer): Peer {
  switch (peer._) {
    case 'inputPeerChat': return { _: 'peerChat', chat_id: peer.chat_id };
    case 'inputPeerUser': return { _: 'peerUser', user_id: peer.user_id };
    default: throw TypeError('Unknown peer type');
  }
}

export function mockHistory(peer: InputPeer, from: number[]) {
  const id = peerToId(peer);

  if (!dateCounters[id]) dateCounters[id] = Date.now() - 100;
  if (!histories[id]) histories[id] = [];

  let f = 0; // from counter

  // mocking loop
  for (let i = 0; i < MAX_HISTORY_LIMIT; i++) {
    const from_id = from[f++];
    histories[id].push(
      mockMessage({
        to_id: peerToPeer(peer),
        from_id,
        date: dateCounters[id] -= 3600,
        out: from_id === me.id,
      }),
    );

    if (f >= from.length) f = 0;
  }
}

export function mockHistorySlice(limit: number, offset_id: number, peer: InputPeer): { count: number, messages: Message[] } {
  const id = peerToId(peer);

  if (!histories[id]) mockHistory(peer, users.map((user) => user.id));

  if (offset_id === 0) return { count: histories[id].length, messages: histories[id].slice(0, limit) };

  for (let i = histories[id].length - 1; i >= 0; i--) {
    if (histories[id][i].id === offset_id) {
      return {
        count: histories[id].length,
        messages: histories[id].slice(i + 1, i + limit + 1),
      };
    }
  }

  return { count: 0, messages: [] };
}
