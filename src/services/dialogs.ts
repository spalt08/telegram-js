import { BehaviorSubject } from 'rxjs';
import { TLConstructor } from 'mtproto-js';
import client from 'client/client';
import { Dialog } from 'cache/types';
import { userCache, chatCache, messageCache } from 'cache/repos';
import { arrayToMap } from 'helpers/data';

/**
 * Singleton service class for handling auth flow
 */
export default class DialogsService {
  dialogs = new BehaviorSubject<Dialog[]>([]);

  getDialogs() {
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

        userCache.extend(arrayToMap(data.users, 'id'));
        chatCache.extend(arrayToMap(data.chats, 'id'));
        messageCache.extend(arrayToMap(data.messages, 'id'));

        this.dialogs.next(data.dialogs as Dialog[]);
      }
    });
  }
}
