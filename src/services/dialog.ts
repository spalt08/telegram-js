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
  Dialog,
} from 'cache/types';
import { peerToInputDialogPeer, peerToInputPeer } from 'cache/accessors';
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

    // The client pushes it before pushing messages
    client.updates.on('chat', (chat: Chat) => {
      // It has a broken access_hash for some reason so it shouldn't replace an existing chat
      if (!chatCache.has(chat.id)) {
        chatCache.put(chat);
      }
    });

    messageCache.indices.history.newestMessages.subscribe(([peer, messageId]) => {
      this.changeOrLoadDialog(peer, (dialog) => {
        if (dialog.top_message === messageId) {
          return undefined;
        }

        let unread = dialog.unread_count;
        const message = messageCache.get(peerMessageToId(dialog.peer, messageId));
        if (message && message._ !== 'messageEmpty' && message.out === false) {
          if (message.id > dialog.top_message) unread++;
          else unread = Math.max(0, unread - 1);
        }

        return {
          ...dialog,
          top_message: messageId,
          unread_count: unread,
        };
      });
    });

    // incoming message were readed
    client.updates.on('updateReadHistoryInbox', (update: UpdateReadHistoryInbox) => {
      this.changeOrLoadDialog(update.peer, (dialog) => ({
        ...dialog,
        read_inbox_max_id: update.max_id,
        unread_count: update.still_unread_count,
      }));
    });

    // outcoming message were readed
    client.updates.on('updateReadHistoryOutbox', (update: UpdateReadHistoryOutbox) => {
      this.changeOrLoadDialog(update.peer, (dialog) => ({
        ...dialog,
        read_outbox_max_id: update.max_id,
      }));
    });

    // incoming message were readed (channel)
    client.updates.on('updateReadChannelInbox', (update: UpdateReadChannelInbox) => {
      this.changeOrLoadDialog({ _: 'peerChannel', channel_id: update.channel_id }, (dialog) => ({
        ...dialog,
        read_inbox_max_id: update.max_id,
        unread_count: update.still_unread_count,
      }));
    });

    // outcoming message were readed (channel)
    client.updates.on('updateReadChannelOutbox', (update: UpdateReadChannelOutbox) => {
      this.changeOrLoadDialog({ _: 'peerChannel', channel_id: update.channel_id }, (dialog) => ({
        ...dialog,
        read_outbox_max_id: update.max_id,
      }));
    });

    client.updates.on('updateDialogUnreadMark', (update: any) => {
      this.changeOrLoadDialog(update.peer.peer, (dialog) => ({
        ...dialog,
        unread_mark: update.unread,
      }));
    });

    client.updates.on('updateDialogPinned', (update: UpdateDialogPinned) => {
      if (update.peer._ === 'dialogPeer') {
        this.changeOrLoadDialog(update.peer.peer, (dialog) => ({
          ...dialog,
          pinned: update.pinned,
        }));
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

          let dialogsToPreload: Dialog[] | undefined;
          if (this.dialogs.value.length === 0) dialogsToPreload = data.dialogs.slice(0, 10);

          if (data.dialogs.length < chunk - 10) { // -10 just in case
            this.isComplete = true;
          }

          userCache.put(data.users);
          chatCache.put(data.chats);
          messageCache.put(data.messages);
          dialogCache.put(data.dialogs);
          this.messageService.pushMessages(data.messages);

          if (dialogsToPreload) this.preloadDialogs(dialogsToPreload);
        }
      } finally {
        if (cb) cb();
      }
    });
  }

  protected changeOrLoadDialog(peer: Peer, modify: (dialog: Dialog) => Dialog | null | undefined) {
    const dialog = dialogCache.get(peerToId(peer));

    if (dialog) {
      const newDialog = modify(dialog);
      if (newDialog) {
        dialogCache.put(newDialog);
      }
    } else {
      this.loadPeerDialogs([peer]);
    }
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
    const request = { peers };
    client.call('messages.getPeerDialogs', request, (error: any, data?: PeerDialogs) => {
      if (error || !data) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Failed to load peer dialogs', { request, error });
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

  preloadDialogs = (dialogs: Dialog[]) => {
    for (let i = 0; i < dialogs.length; i++) {
      if (dialogs[i].unread_count === 0) {
        const payload = { peer: peerToInputPeer(dialogs[i].peer), offset_id: dialogs[i].read_inbox_max_id, add_offset: -10, limit: 20 };
        client.call('messages.getHistory', payload, { thread: 2 }, (err: any, data: any) => {
          if (err || !data) return;

          userCache.put(data.users);
          chatCache.put(data.chats);
          messageCache.put(data.messages);
          this.messageService.pushMessages(data.messages);
        });
      }
    }
  };
}
