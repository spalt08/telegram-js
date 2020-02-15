import { BehaviorSubject } from 'rxjs';
import client from 'client/client';
import { userCache, chatCache, messageCache, dialogCache } from 'cache';
import { peerMessageToId, peerToId, messageToId, messageToDialogPeer } from 'helpers/api';
import { UpdateReadHistoryInbox, UpdateReadChannelInbox } from 'cache/types';
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

    messageCache.indices.history.newestMessages.subscribe(([peerId, messageId]) => {
      const dialog = dialogCache.get(peerId);
      if (!dialog) {
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

    // incoming message were readed
    client.updates.on('updateReadHistoryInbox', (update: UpdateReadHistoryInbox) => {
      const dialog = dialogCache.get(peerToId(update.peer));

      // to do fetch new peer
      if (!dialog) {
        return;
      }

      dialogCache.put({
        ...dialog,
        read_inbox_max_id: update.max_id,
        unread_count: update.still_unread_count,
      });
    });

    // incoming message were readed (channel)
    client.updates.on('updateReadChannelInbox', (update: UpdateReadChannelInbox) => {
      const dialog = dialogCache.get(peerToId({ _: 'peerChannel', channel_id: update.channel_id }));

      // to do fetch new peer
      if (!dialog) {
        return;
      }

      dialogCache.put({
        ...dialog,
        read_inbox_max_id: update.max_id,
        unread_count: update.still_unread_count,
      });
    });

    // todo: Subscribe to new and removed dialogs
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
          this.messageService.pushMessages(data.messages);
          dialogCache.put(data.dialogs);
        }
      } finally {
        if (cb) cb();
      }
    });
  }
}
