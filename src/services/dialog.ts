import { BehaviorSubject } from 'rxjs';
import { TLConstructor } from 'mtproto-js';
import client from 'client/client';
import { userCache, chatCache, messageCache, dialogCache } from 'cache';
import { peerToId } from 'helpers/api';

/**
 * Singleton service class for handling auth flow
 */
export default class DialogsService {
  dialogs = new BehaviorSubject(dialogCache.indices.order.getIds());

  constructor() {
    dialogCache.changes.subscribe(() => {
      this.dialogs.next(dialogCache.indices.order.getIds());

      client.updates.on('updateNewChannelMessage', (res: TLConstructor) => {
        const update = res.json();

        messageCache.put(update.message);

        const dialog = dialogCache.get(peerToId(update.message.to_id));

        if (!dialog) {
          // todo load dialog
          return;
        }

        dialogCache.put({ ...dialog, top_message: update.message.id });
      });

      // client.updates.on('updateShortMessage', (res: TLConstructor) => {
      //   const update = res.json();

      //   messageCache.add(update.id, update);

      //   this.setTopMessage({ _: 'peerUser', user_id: update.user_id }, update);
      // });

      // client.updates.on('updateNewMessage', (res: TLConstructor) => {
      //   const update = res.json();

      //   messageCache.add(update.message.id, update.message);

      //   this.setTopMessage(update.message.to_id, update.message);

      //   console.log(update);
      // });

      // client.updates.on('updateDeleteMessages', (res: TLConstructor) => {
      //   const update = res.json();

      //   console.log(update);
      // });
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
