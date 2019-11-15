import { BehaviorSubject } from 'rxjs';
import { TLConstructor } from 'mtproto-js';
import client from 'client/client';
import { userCache, chatCache, messageCache, dialogCache } from 'cache';

/**
 * Singleton service class for handling auth flow
 */
export default class DialogsService {
  dialogs = new BehaviorSubject(dialogCache.indices.order.getItems());

  constructor() {
    dialogCache.changes.subscribe(() => {
      this.dialogs.next(dialogCache.indices.order.getItems());
    });
  }

  updateDialogs() {
    const payload = {
      offset_date: 0,
      offset_id: 0,
      offset_peer: { _: 'inputPeerEmpty' },
      limit: 20,
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
}
