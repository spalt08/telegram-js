import { BehaviorSubject } from 'rxjs';
import { TLConstructor } from 'mtproto-js';
import client from 'client/client';
import { Dialog, Peer, Message } from 'cache/types';
import { peerToKey } from 'helpers/api';
import { userCache, chatCache, messageCache } from 'cache/repos';
import { arrayToMap } from 'helpers/data';

/**
 * Singleton service class for handling auth flow
 */
export default class DialogService {
  sequence = new BehaviorSubject<string[]>([]);

  storage: Record<string, BehaviorSubject<Dialog>>;

  constructor() {
    this.storage = {};

    client.updates.on('updateNewChannelMessage', (res: TLConstructor) => {
      const update = res.json();

      messageCache.add(update.message.id, update.message);

      this.setTopMessage(update.message.to_id, update.message);
    });

    client.updates.on('updateShortMessage', (res: TLConstructor) => {
      const update = res.json();

      messageCache.add(update.id, update);

      this.setTopMessage({ _: 'peerUser', user_id: update.user_id }, update);
    });

    client.updates.on('updateNewMessage', (res: TLConstructor) => {
      const update = res.json();

      messageCache.add(update.message.id, update.message);

      this.setTopMessage(update.message.to_id, update.message);

      console.log(update);
    });

    client.updates.on('updateDeleteMessages', (res: TLConstructor) => {
      const update = res.json();

      console.log(update);
    });
  }

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

        const newSeq = [];
        for (let i = 0; i < data.dialogs.length; i += 1) {
          const key = peerToKey(data.dialogs[i].peer);

          newSeq.push(key);

          if (!this.storage[key]) {
            this.storage[key] = new BehaviorSubject(data.dialogs[i]);
          } else {
            this.storage[key].next(data.dialogs[i]);
          }
        }

        this.sequence.next(newSeq);
      }
    });
  }

  setTopMessage(peer: Peer, message: Message) {
    const key = peerToKey(peer);
    const seq = this.sequence.value.slice(0);
    const dialog = this.storage[key];

    if (!dialog || !dialog.value) return;

    console.log(key, message.id);
    // todo optimize performance
    this.storage[key].next({ ...dialog.value, top_message: message.id });

    if (dialog.value.pinned) return;

    const pos = seq.indexOf(key);

    // todo: test without pinned messages
    for (let i = 0; i < seq.length; i += 1) {
      if (i !== pos) {
        const nextDialog = this.storage[i].value;

        if (nextDialog.pinned === true) continue;
        if (nextDialog.top_message > message.id) continue;
        if (i === pos - 1) return;

        this.sequence.next(seq.slice(0, i).concat([key], seq.slice(i, pos), seq.slice(pos + 1)));
      }
    }

    seq.unshift(seq.splice(pos, 1)[0]);

    this.sequence.next(seq);
  }

  getDialog(peer: Peer): Dialog {
    return this.storage[peerToKey(peer)].value;
  }
}
