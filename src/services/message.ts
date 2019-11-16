import { BehaviorSubject } from 'rxjs';
import { TLConstructor, ClientError, TLAbstract } from 'mtproto-js';
import client from 'client/client';
import { Peer, Message } from 'cache/types';
import { chatCache, messageCache, userCache } from 'cache';
import { peerToInputPeer } from 'cache/accessors';
import { peerToId } from '../helpers/api';

/**
 * Singleton service class for handling messages stuff
 */
export default class MessagesService {
  activePeer = new BehaviorSubject<Peer | null>(null);

  isLoading = new BehaviorSubject<boolean>(false);

  history = new BehaviorSubject<Readonly<number[]>>([]);

  peerHistoryUnsubscribe: (() => void) | undefined;

  selectPeer(peer: Peer) {
    if (this.activePeer.value && peerToId(peer) === peerToId(this.activePeer.value)) {
      return;
    }

    if (this.peerHistoryUnsubscribe) {
      this.peerHistoryUnsubscribe();
    }

    this.activePeer.next(peer);
    this.history.next(messageCache.indices.peers.getHistory(peer));
    this.peerHistoryUnsubscribe = messageCache.indices.peers.watchHistory(peer, (history) => {
      this.history.next(history);
    });

    if (this.history.value.length > 0) {
      return; // todo: Load older on scroll
    }

    this.isLoading.next(true);
    this.loadMessages(peer, 0, (messages) => {
      if (messages && messages.length > 0) {
        this.loadMessages(peer, messages[messages.length - 1].id);
      }
    });
  }

  protected loadMessages(peer: Peer, olderThanId = 0, cb?: (history?: Readonly<Message>[]) => void) {
    this.isLoading.next(true);

    const payload = {
      peer: peerToInputPeer(peer),
      offset_id: olderThanId,
      offset_date: Math.floor(Date.now() / 1000),
      add_offset: 0,
      limit: 100,
      max_id: 0,
      min_id: 0,
      hash: 0,
    };

    client.call('messages.getHistory', payload, (_err: ClientError, res: TLAbstract) => {
      let messages: Readonly<Message>[] | undefined;

      try {
        if (res instanceof TLConstructor) {
          const data = res.json();
          messages = data.messages;
          userCache.put(data.users);
          chatCache.put(data.chats);
          messageCache.indices.peers.putHistoryMessages(data.messages);
          // no need to call this.history.next(...), it's already subscribed and notified
        }
      } finally {
        this.isLoading.next(false);
      }

      if (cb) cb(messages);
    });
  }

  // todo: Watch new messages and put them to the thread of the active peer:
  // messagesCache.indices.peers.putHistoryMessages([message]);
}
