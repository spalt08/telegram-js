import { BehaviorSubject } from 'rxjs';
import { TLConstructor, ClientError, TLAbstract } from 'mtproto-js';
import client from 'client/client';
import { Peer } from 'cache/types';
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

    this.loadMessages(peer, 0);
  }

  protected loadMessages(peer: Peer, olderThanId = 0) {
    if (this.isLoading.value) return;

    this.isLoading.next(true);

    const chunk = 100;
    const payload = {
      peer: peerToInputPeer(peer),
      offset_id: olderThanId,
      offset_date: 0,
      add_offset: 0,
      limit: chunk,
      max_id: 0,
      min_id: 0,
      hash: 0,
    };

    client.call('messages.getHistory', payload, (_err: ClientError, res: TLAbstract) => {
      try {
        if (res instanceof TLConstructor) {
          const data = res.json();

          userCache.put(data.users);
          chatCache.put(data.chats);
          messageCache.indices.peers.putHistoryMessages(data.messages);
          if (data.messages.length < chunk - 10) { // -10 just in case
            messageCache.indices.peers.pubHistoryComplete(peer);
          }
        }
      } finally {
        this.isLoading.next(false);
      }
    });
  }

  loadMoreHistory() {
    if (this.activePeer.value && !messageCache.indices.peers.isHistoryComplete(this.activePeer.value)) {
      const offset_id = this.history.value[this.history.value.length - 1];
      this.loadMessages(this.activePeer.value, offset_id);
    }
  }

  // todo: Watch new messages and put them to the thread of the active peer:
  // messagesCache.indices.peers.putHistoryMessages([message]);
}
