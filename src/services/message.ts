import { BehaviorSubject } from 'rxjs';
import { TLConstructor, ClientError, TLAbstract } from 'mtproto-js';
import client from 'client/client';
import { inputPeer } from 'helpers/data';
import { Peer } from 'cache/types';
import { messageCache } from 'cache/repos';

/**
 * Singleton service class for handling messages stuff
 */
export default class MessagesService {
  activePeer = new BehaviorSubject<Peer | null>(null);

  isLoading = new BehaviorSubject<boolean>(false);

  history: number[] = [];

  selectPeer(peer: Peer) {
    this.history = [];
    this.activePeer.next(peer);
    this.isLoading.next(true);

    const payload = {
      peer: inputPeer(peer),
      offset_id: 0,
      offset_date: Math.floor(Date.now() / 1000),
      add_offset: 0,
      limit: 40,
      max_id: 0,
      min_id: 0,
      hash: 0,
    };

    client.call('messages.getHistory', payload, (_err: ClientError, res: TLAbstract) => {
      if (res instanceof TLConstructor) {
        const data = res.json();

        for (let i = data.messages.length - 1; i >= 0; i -= 1) {
          messageCache.add(data.messages[i].id, data.messages[i]);
          this.history.push(data.messages[i].id);
        }

        this.isLoading.next(false);
      }
    });
  }
}
