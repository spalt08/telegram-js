import { BehaviorSubject } from 'rxjs';
import client from 'client/client';
import { userCache, chatCache, messageCache, dialogCache } from 'cache';
import { peerMessageToId } from 'helpers/api';
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

      dialogCache.put({
        ...dialog,
        top_message: messageId,
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
