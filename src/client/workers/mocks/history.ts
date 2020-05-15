import { InputPeer, Message, Peer, MessagesFilter } from 'mtproto-js';
import { mockMessage } from './message';
import { users, me } from './user';
import { mockPhoto } from './photo';

const dateCounters: Record<string, number> = {};
const histories: Record<string, Message.message[]> = {};
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

    // if (i % 10 === 0) {
    //   mockPhoto(200, 320, (photo) => {
    //     histories[id][i].media = {
    //       _: 'messageMediaPhoto',
    //       photo,
    //     };
    //   });
    // }

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

export function mockHistorySearch(limit: number, offset_id: number, filter: MessagesFilter, peer: InputPeer): { count: number, messages: Message[] } {
  const id = peerToId(peer);

  let items = histories[id];

  if (filter._ === 'inputMessagesFilterPhotoVideo') {
    items = items.filter((msg) => msg.media && msg.media._ === 'messageMediaPhoto');
  }

  if (offset_id === 0) return { count: items.length, messages: items.slice(0, limit) };

  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].id === offset_id) {
      return {
        count: items.length,
        messages: items.slice(i + 1, i + limit + 1),
      };
    }
  }

  return { count: 0, messages: [] };
}
