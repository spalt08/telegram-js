import { BehaviorSubject } from 'rxjs';
import { TLConstructor } from 'mtproto-js';
import client from 'client/client';
import { Dialog, User, Chat, Message } from 'cache/types';
import { userCache, chatCache, messageCache } from 'cache/repos';

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

        const users = data.users.reduce((acc: Record<number, User>, user: User) => ({ ...acc, [user.id]: user }), {});
        const chats = data.chats.reduce((acc: Record<number, Chat>, chat: Chat) => ({ ...acc, [chat.id]: chat }), {});
        const messages = data.messages.reduce((acc: Record<number, Message>, message: Message) => ({ ...acc, [message.id]: message }), {});

        userCache.extend(users);
        chatCache.extend(chats);
        messageCache.extend(messages);

        this.dialogs.next(data.dialogs as Dialog[]);
      }
    });
  }
}
