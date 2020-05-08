import { User, Chat, Dialog, Message, InputPeer } from 'mtproto-js';
import { mockHistorySlice } from './history';

const dialogTemplate: Dialog.dialog = {
  _: 'dialog',
  pinned: false,
  unread_mark: false,
  peer: { _: 'peerUser', user_id: 0 },
  top_message: 0,
  read_inbox_max_id: 0,
  read_outbox_max_id: 0,
  unread_count: 0,
  unread_mentions_count: 0,
  notify_settings: { _: 'peerNotifySettings' },
};

export function mockDialogForPeers(peers: Array<User.user | Chat.chat>): { dialogs: Dialog[], messages: Message[] } {
  const messages = peers.map<Message>((p) => {
    let peer: InputPeer;

    switch (p._) {
      case 'user':
        peer = { _: 'inputPeerUser', user_id: p.id, access_hash: `userhash${p.id}` };
        break;
      default:
        peer = { _: 'inputPeerChat', chat_id: p.id };
    }

    return mockHistorySlice(1, 0, peer).messages[0];
  });

  const dialogs = peers.map<Dialog.dialog>((peer, i) => ({
    ...dialogTemplate,
    peer: peer._ === 'user' ? { _: 'peerUser', user_id: peer.id } : { _: 'peerChat', chat_id: peer.id },
    top_message: messages[i].id,
  }));

  return { dialogs, messages };
}
