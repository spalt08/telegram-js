import { BehaviorSubject } from 'rxjs';
import { TLConstructor } from 'mtproto-js';
import client from 'client/client';
import { userCache, chatCache, messageCache, dialogCache } from 'cache';
import { peerToId, shortMessageToMessage, peerMessageToId } from 'helpers/api';
import { Message } from 'cache/types';

/**
 * Singleton service class for handling auth flow
 */
export default class DialogsService {
  dialogs = new BehaviorSubject(dialogCache.indices.order.getIds());

  loading = new BehaviorSubject(false);

  protected isComplete = false;

  constructor() {
    client.updates.on('updateNewChannelMessage', (res: TLConstructor) => {
      const update = res.json();
      this.updateTopMessage(update.message);
    });

    client.updates.on('updateShortMessage', (res: TLConstructor) => {
      const update = res.json();
      // todo store userid
      const message = shortMessageToMessage(client.svc.meta[client.cfg.dc].userID as number, update);
      this.updateTopMessage(message);
    });

    client.updates.on('updateNewMessage', (res: TLConstructor) => {
      const update = res.json();
      this.updateTopMessage(update.message);
    });

    dialogCache.indices.order.changes.subscribe(() => {
      this.dialogs.next(dialogCache.indices.order.getIds());
    });

    client.updates.on('updateDeleteMessages', (res: TLConstructor) => {
      const update = res.json();
      // todo update deleted messages
      console.log(update);
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

  protected updateTopMessage(message: Readonly<Message>) {
    if (message._ === 'messageEmpty') {
      // todo fetch previous top_message
      return;
    }

    if (message._ === 'messageService') {
      // todo handle message update
      return;
    }

    messageCache.put(message);

    const dialog = dialogCache.get(peerToId(message.to_id));

    if (!dialog) {
      // todo fetch dialog
      return;
    }

    dialogCache.put({ ...dialog, top_message: message.id });
  }

  protected doUpdateDialogs(offsetDate = 0, cb?: () => void) {
    const chunk = 60;
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
        localStorage.setItem('dc', err.message.slice(-1));
        client.cfg.dc = +err.message.slice(-1);
        this.doUpdateDialogs();
        return;
      }

      try {
        if (res instanceof TLConstructor && (res._ === 'messages.dialogs' || res._ === 'messages.dialogsSlice')) {
          const data = res.json();

          if (data.dialogs.length < chunk - 10) { // -10 just in case
            this.isComplete = true;
          }

          userCache.put(data.users);
          chatCache.put(data.chats);
          data.messages.forEach((message: Message) => messageCache.indices.peers.putHistoryMessages([message]));
          dialogCache.put(data.dialogs);
        }
      } finally {
        if (cb) cb();
      }
    });
  }
}
