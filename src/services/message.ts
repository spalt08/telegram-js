import { BehaviorSubject } from 'rxjs';
import { TLConstructor, ClientError, TLAbstract } from 'mtproto-js';
import client from 'client/client';
import { Peer } from 'cache/types';
import { messageCache, userCache } from 'cache';
import { peerToInputPeer } from 'cache/accessors';

/**
 * Singleton service class for handling messages stuff
 */
export default class MessagesService {
  activePeer = new BehaviorSubject<Peer | null>(null);

  isLoading = new BehaviorSubject<boolean>(false);

  // todo: Watch the cache
  history = new BehaviorSubject<number[]>([]);

  selectPeer(peer: Peer) {
    this.activePeer.next(peer);
    this.history.next(messageCache.indices.peers.getHistoryIds(peer));

    if (this.history.value.length > 0) {
      return; // todo: Load older on scroll
    }

    this.isLoading.next(true);

    const payload = {
      peer: peerToInputPeer(peer),
      offset_id: 0,
      offset_date: Math.floor(Date.now() / 1000),
      add_offset: 0,
      limit: 40,
      max_id: 0,
      min_id: 0,
      hash: 0,
    };

    client.call('messages.getHistory', payload, (_err: ClientError, res: TLAbstract) => {
      try {
        if (res instanceof TLConstructor) {
          const data = res.json();
          userCache.put(data.users);
          messageCache.indices.peers.putHistoryMessages(data.messages);
          this.history.next(messageCache.indices.peers.getHistoryIds(peer));
        }
      } finally {
        this.isLoading.next(false);
      }
    });
  }

  // todo: Watch new messages and put them to the thread of the active peer:
  // messagesCache.indices.peers.putHistoryMessages([message]);
}
