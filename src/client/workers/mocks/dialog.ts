import { User, Chat, Dialog, Message } from 'mtproto-js';
import { mockMessage } from './message';
import { me, users } from './user';

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

export function mockDialogForPeers(peers: Array<User.user | Chat.chat>): { dialogs: Dialog[], messages: Message.message[] } {
  const messages = peers.map<Message.message>((peer) => {
    switch (peer._) {
      case 'user':
        return mockMessage({
          from_id: peer.id,
          to_id: { _: 'peerUser', user_id: me.id },
          out: peer.id === me.id,
        });

      default:
        return mockMessage({
          from_id: users[1].id,
          to_id: { _: 'peerChat', chat_id: peer.id },
        });
    }
  });

  const dialogs = peers.map<Dialog.dialog>((peer, i) => ({
    ...dialogTemplate,
    peer: peer._ === 'user' ? { _: 'peerUser', user_id: peer.id } : { _: 'peerChat', chat_id: peer.id },
    top_message: messages[i].id,
  }));

  return { dialogs, messages };
}
