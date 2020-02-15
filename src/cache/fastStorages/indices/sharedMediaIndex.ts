import { Peer, Message } from 'cache/types';
import { peerToId } from 'helpers/api';
import { Subject, ReplaySubject, Observable } from 'rxjs';
import Collection from '../collection';

export default function sharedMediaIndex(collection: Collection<Message, any>) {
  const cache: Record<string, { snapshot: Collection<Message, any, number>, subject: Subject<Message[]> }> = {};

  collection.changes.subscribe((collectionChanges) => {
    collectionChanges.forEach(([action, item]) => {
      switch (action) {
        case 'remove': {
          if (item._ === 'message') {
            const cacheLine = cache[`user_${item.from_id}`];
            if (cacheLine) {
              cacheLine.snapshot.remove(item.id);
              cacheLine.subject.next(cacheLine.snapshot.getAll());
            }
          }
          break;
        }
        default:
      }
    },
    );
  });

  function getCacheLine(peer: Peer) {
    let cacheLine = cache[peerToId(peer)];
    if (!cacheLine) {
      cacheLine = { snapshot: new Collection({ getId: (item) => item.id }), subject: new ReplaySubject(1) };
      cache[peerToId(peer)] = cacheLine;
    }
    return cacheLine;
  }

  return {
    putMediaMessages(peer: Peer, messages: Message[]) {
      if (!messages.length) {
        return;
      }

      collection.put(messages);
      const cacheLine = getCacheLine(peer);
      cacheLine.snapshot.batchChanges(() => {
        messages
          .filter((m) => !cacheLine.snapshot.has(m.id))
          .forEach((m) => cacheLine.snapshot.put(m));
      });
      const snapshot = cacheLine.snapshot.getAll();
      snapshot.sort((i1, i2) => i2.id - i1.id);
      cacheLine.subject.next(snapshot);
    },

    getPeerMedia(peer: Peer): Observable<Message[]> {
      return getCacheLine(peer).subject;
    },

    getEarliestPeerMedia(peer: Peer): Message | undefined {
      const cacheLine = getCacheLine(peer);
      return cacheLine.snapshot.getAll()[0];
    },
  };
}
