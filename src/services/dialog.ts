import { BehaviorSubject } from 'rxjs';
import { TLConstructor } from 'mtproto-js';
import client from 'client/client';
import { userCache, chatCache, messageCache, dialogCache } from 'cache';
import { peerToId, shortMessageToMessage } from 'helpers/api';
import { Message } from 'cache/types';

/**
 * Singleton service class for handling auth flow
 */
export default class DialogsService {
  dialogs = new BehaviorSubject(dialogCache.indices.order.getIds());

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

    dialogCache.indices.order.changeSubject.subscribe(() => {
      this.dialogs.next(dialogCache.indices.order.getIds());
    });

    client.updates.on('updateDeleteMessages', (res: TLConstructor) => {
      const update = res.json();
      // todo update deleted messages
      console.log(update);
    });
  }

  updateDialogs() {
    const payload = {
      offset_date: 0,
      offset_id: 0,
      offset_peer: { _: 'inputPeerEmpty' },
      limit: 50,
      hash: 0,
    };

    client.call('messages.getDialogs', payload, (err, res) => {
      if (res instanceof TLConstructor && (res._ === 'messages.dialogs' || res._ === 'messages.dialogsSlice')) {
        const data = res.json();

        userCache.put(data.users);
        chatCache.put(data.chats);
        messageCache.put(data.messages);
        dialogCache.replaceAll(data.dialogs);
      }
    });
  }

  updateTopMessage(message: Message) {
    messageCache.put(message);

    if (message._ === 'messageEmpty') {
      // todo fetch previous top_message
      return;
    }

    const dialog = dialogCache.get(peerToId(message.to_id));

    if (!dialog) {
      // todo fetch dialog
      return;
    }

    dialogCache.put({ ...dialog, top_message: message.id });
  }
}
