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

  total = 0;

  loading = false;

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
    if (this.loading) return;

    this.loading = true;

    const payload = {
      offset_date: offsetDate,
      offset_id: 0,
      offset_peer: { _: 'inputPeerEmpty' },
      limit: 20,
      hash: 0,
    };

    client.call('messages.getDialogs', payload, (err, res) => {
      if (err && err.message && err.message.indexOf('USER_MIGRATE_') > -1) {
        // todo store dc
        localStorage.setItem('dc', err.message.slice(-1));
        client.cfg.dc = +err.message.slice(-1);
        this.updateDialogs();
        return;
      }

      if (res instanceof TLConstructor && (res._ === 'messages.dialogs' || res._ === 'messages.dialogsSlice')) {
        const data = res.json();

        this.total = res._ === 'messages.dialogs' ? data.dialogs.length : data.count;

        userCache.put(data.users);
        chatCache.put(data.chats);
        messageCache.put(data.messages);
        dialogCache.put(data.dialogs);
      }

      this.loading = false;
    });
  }

  loadMoreDialogs() {
    if (this.dialogs.value.length > 0 && this.dialogs.value.length < this.total) {
      const last = dialogCache.get(this.dialogs.value[this.dialogs.value.length - 1]);
      if (last) {
        const msg = messageCache.get(peerMessageToId(last.peer, last.top_message));
        if (msg && msg._ !== 'messageEmpty') this.updateDialogs(msg.date);
      }
    }
  }

  updateTopMessage(message: Readonly<Message>) {
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
}
