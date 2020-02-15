import { BehaviorSubject } from 'rxjs';
import client from 'client/client';
import { userCache, chatCache, messageCache, dialogCache } from 'cache';
import { peerMessageToId, peerToId } from 'helpers/api';
import {
  Chat,
  UpdateReadHistoryInbox,
  UpdateReadChannelInbox,
  UpdateReadHistoryOutbox,
  UpdateReadChannelOutbox,
  UpdateDialogPinned,
  Peer,
  InputDialogPeer,
  PeerDialogs,
} from 'cache/types';
import { peerToInputDialogPeer } from 'cache/accessors';
import MessageService from './message/message';

/**
 * Singleton service class for handling auth flow
 */
export default class DialogsService {
  dialogs = new BehaviorSubject(dialogCache.indices.order.getIds());

  loading = new BehaviorSubject(false);

  protected isComplete = false;

  constructor(private messageService: MessageService) {
    dialogCache.indices.order.changes.subscribe(() => {
      this.dialogs.next(dialogCache.indices.order.getIds());
    });

    messageCache.indices.history.newestMessages.subscribe(([peer, messageId]) => {
      const dialog = dialogCache.get(peerToId(peer));
      if (!dialog) {
        this.loadPeerDialogs([peer]);
        return;
      }

      if (dialog.top_message === messageId) {
        return;
      }

      let unread = dialog.unread_count;
      const message = messageCache.get(peerMessageToId(dialog.peer, messageId));
      if (message && message._ !== 'messageEmpty' && message.out === false) {
        if (message.id > dialog.top_message) unread++;
        else unread = Math.max(0, unread - 1);
      }

      dialogCache.put({
        ...dialog,
        top_message: messageId,
        unread_count: unread,
      });
    });

    // The client pushes it before pushing messages
    client.updates.on('chat', (chat: Chat) => {
      chatCache.put(chat);
    });

    // incoming message were readed
    client.updates.on('updateReadHistoryInbox', (update: UpdateReadHistoryInbox) => {
      const dialog = dialogCache.get(peerToId(update.peer));

      if (!dialog) {
        this.loadPeerDialogs([update.peer]);
        return;
      }

      dialogCache.put({
        ...dialog,
        read_inbox_max_id: update.max_id,
        unread_count: update.still_unread_count,
      });
    });

    // outcoming message were readed
    client.updates.on('updateReadHistoryOutbox', (update: UpdateReadHistoryOutbox) => {
      const dialog = dialogCache.get(peerToId(update.peer));

      if (!dialog) {
        this.loadPeerDialogs([update.peer]);
        return;
      }

      dialogCache.put({
        ...dialog,
        read_outbox_max_id: update.max_id,
      });
    });

    // incoming message were readed (channel)
    client.updates.on('updateReadChannelInbox', (update: UpdateReadChannelInbox) => {
      const peer = { _: 'peerChannel', channel_id: update.channel_id } as const;
      const dialog = dialogCache.get(peerToId(peer));

      if (!dialog) {
        this.loadPeerDialogs([peer]);
        return;
      }

      dialogCache.put({
        ...dialog,
        read_inbox_max_id: update.max_id,
        unread_count: update.still_unread_count,
      });
    });

    // outcoming message were readed (channel)
    client.updates.on('updateReadChannelOutbox', (update: UpdateReadChannelOutbox) => {
      const peer = { _: 'peerChannel', channel_id: update.channel_id } as const;
      const dialog = dialogCache.get(peerToId({ _: 'peerChannel', channel_id: update.channel_id }));

      if (!dialog) {
        this.loadPeerDialogs([peer]);
        return;
      }

      dialogCache.put({
        ...dialog,
        read_inbox_max_id: update.max_id,
      });
    });

    client.updates.on('updateDialogUnreadMark', (update: any) => {
      const dialog = dialogCache.get(peerToId(update.peer.peer));

      if (!dialog) {
        this.loadPeerDialogs([update.peer.peer]);
        return;
      }

      dialogCache.put({
        ...dialog,
        unread_mark: update.unread,
      });
    });

    client.updates.on('updateDialogPinned', (update: UpdateDialogPinned) => {
      if (update.peer._ === 'dialogPeer') {
        const dialog = dialogCache.get(peerToId(update.peer.peer));

        if (!dialog) {
          this.loadPeerDialogs([update.peer.peer]);
          return;
        }

        dialogCache.put({
          ...dialog,
          pinned: update.pinned,
        });
      }
    });
  }

  updateDialogs(offsetDate = 0) {
    if (this.loading.value) return;
    this.loading.next(true);
    this.doUpdateDialogs(offsetDate, () => {
      this.loading.next(false);
    });
  }

  loadMoreDialogs() {
    if (!this.isComplete) {
      const last = dialogCache.get(this.dialogs.value[this.dialogs.value.length - 1]);
      if (last) {
        const msg = messageCache.get(peerMessageToId(last.peer, last.top_message));
        if (msg && msg._ !== 'messageEmpty') this.updateDialogs(msg.date);
      }
    }
  }

  protected doUpdateDialogs(offsetDate = 0, cb?: () => void) {
    const chunk = 30;
    const payload = {
      offset_date: offsetDate,
      offset_id: 0,
      offset_peer: { _: 'inputPeerEmpty' },
      limit: chunk,
      hash: 0,
    };

    client.call('messages.getDialogs', payload, (err, res) => {
      if (err && err.message && err.message.indexOf('USER_MIGRATE_') > -1) {
        // todo store dc
        client.setBaseDC(+err.message.slice(-1));
        this.doUpdateDialogs(offsetDate, cb);
        return;
      }

      try {
        if (res && (res._ === 'messages.dialogs' || res._ === 'messages.dialogsSlice')) {
          const data = res;

          if (data.dialogs.length < chunk - 10) { // -10 just in case
            this.isComplete = true;
          }

          userCache.put(data.users);
          chatCache.put(data.chats);
          messageCache.put(data.messages);
          dialogCache.put(data.dialogs);
          this.messageService.pushMessages(data.messages);
        }
      } finally {
        if (cb) cb();
      }
    });
  }

  protected loadPeerDialogs(peers: Peer[]) {
    const inputPeers: InputDialogPeer[] = [];

    peers.forEach((peer) => {
      try {
        inputPeers.push(peerToInputDialogPeer(peer));
      } catch (error) {
        // It's not a destiny to chat with this peer
      }
    });

    this.loadInputPeerDialogs(inputPeers);
  }

  protected loadInputPeerDialogs(peers: InputDialogPeer[]) {
    client.call('messages.getPeerDialogs', { peers }, (err: any, data?: PeerDialogs) => {
      if (err || !data) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Failed to load peer dialogs', err);
        }
        return;
      }

      userCache.put(data.users);
      chatCache.put(data.chats);
      messageCache.put(data.messages);
      dialogCache.put(data.dialogs);
      this.messageService.pushMessages(data.messages);
    });
  }
}
