import { BehaviorSubject, Subject } from 'rxjs';
import binarySearch from 'binary-search';
import { messageToDialogPeer, peerToId } from 'helpers/api';
import { useWhileMounted } from 'core/hooks';
import { Message, Peer } from '../../types';
import Collection from '../collection';

type HistoryWatcher = (ids: Readonly<number[]>) => void;

// todo: Add messages from migrated chats to the corresponding groups. Migrated chats are marked with migrated_to attribute.

// integer means the exact position, float means the position between positions floor(n) and ceil(n)
function findIdInOrderedList(ids: number[], id: number): number {
  const rawValue = binarySearch(ids, id, (id1, id2) => id2 - id1);
  return rawValue >= 0 ? rawValue : (-rawValue - 1.5);
}

class PeerIndex {
  /**
   * The messages from the main messages list. The ids are in descending order.
   * If the messages come together here, it means that they come together in the server database, there are no gaps.
   */
  public historyIds: number[] = [];

  /**
   * Whether the history ids list is filled up to the oldest id
   */
  public historyComplete = false;

  /**
   * The messages got from other sources (e.g. replied to messages). Their positions in the history is unknown.
   * An id may be only in one of the lists (preferable in `historyIds`).
   */
  public vagrantIds = new Set<number>();

  public historyWatchers: HistoryWatcher[] = [];

  public isEmpty() {
    return this.historyIds.length > 0 && this.vagrantIds.size > 0;
  }

  // ids are in descending order
  public putHistoryIds(ids: number[]) {
    if (ids.length === 0) {
      return;
    }

    // Remove ids from vagrant list
    ids.forEach((id) => this.removeVagrantId(id));

    // Find a position where to insert. If the given ids range intersect
    const startIndex = Math.ceil(findIdInOrderedList(this.historyIds, ids[0]));
    const endIndex = Math.floor(findIdInOrderedList(this.historyIds, ids[ids.length - 1])) + 1;

    // Join the given ids with the ids from the found position
    const idsIntersection = [];
    let hasNewIds = false;
    for (let curI = startIndex, newI = 0; curI < endIndex || newI < ids.length;) {
      if (this.historyIds[curI] === ids[newI]) {
        idsIntersection.push(ids[newI]);
        curI += 1;
        newI += 1;
        continue;
      }
      if (this.historyIds[curI] > ids[newI]) {
        idsIntersection.push(this.historyIds[curI]);
        curI += 1;
      } else {
        idsIntersection.push(ids[newI]);
        newI += 1;
        hasNewIds = true;
      }
    }
    if (!hasNewIds) {
      return;
    }

    this.historyIds.splice(startIndex, endIndex - startIndex, ...idsIntersection);
    this.notifyHistoryWatchers();
  }

  public putVagrantId(messageId: number) {
    if (this.getHistoryIdIndex(messageId) === undefined) {
      this.vagrantIds.add(messageId);
    }
  }

  public removeHistoryId(messageId: number) {
    const index = this.getHistoryIdIndex(messageId);
    if (index !== undefined) {
      this.historyIds.splice(index, 1);
      this.notifyHistoryWatchers();
    }
  }

  public removeVagrantId(messageId: number) {
    this.vagrantIds.delete(messageId);
  }

  protected getHistoryIdIndex(messageId: number): number | undefined {
    const index = findIdInOrderedList(this.historyIds, messageId);
    const isIdFound = index % 1 === 0;
    return isIdFound ? index : undefined;
  }

  protected notifyHistoryWatchers() {
    this.historyWatchers.forEach((watcher) => watcher(this.historyIds));
  }
}

/**
 * Indexes messages by peers. Also keeps the history order (in the descending order (new first)).
 */
export default function messagesByPeers(collection: Collection<Message, any>) {
  const peers = {} as Record<string, PeerIndex>;
  const globalChangeSubject = new Subject<[string, Readonly<number[]>]>();
  let isUpdatingByThisIndex = false;

  function getOrCreatePeer(peerId: string) {
    if (!peers[peerId]) {
      peers[peerId] = new PeerIndex();
      peers[peerId].historyWatchers.push((ids) => globalChangeSubject.next([peerId, ids]));
    }
    return peers[peerId];
  }

  function removePeerIfEmpty(peerId: string) {
    // 1 historyWatcher is the global watcher
    if (peers[peerId] && peers[peerId].isEmpty() && peers[peerId].historyWatchers.length === 1) {
      delete peers[peerId];
    }
  }

  collection.changes.subscribe((collectionChanges) => {
    if (isUpdatingByThisIndex) {
      return;
    }

    collectionChanges.forEach(([action, message]) => {
      const peer = messageToDialogPeer(message);
      if (!peer) {
        return;
      }

      const peerId = peerToId(peer);

      switch (action) {
        case 'add': {
          getOrCreatePeer(peerId).putVagrantId(message.id);
          break;
        }
        case 'remove': {
          if (peers[peerId]) {
            peers[peerId].removeHistoryId(message.id);
            peers[peerId].removeVagrantId(message.id);
            removePeerIfEmpty(peerId);
          }
          break;
        }
        // No update because we assume that a message can't change the id or peer
        default:
      }
    });
  });

  return {
    // todo remove debug
    peers,

    /**
     * Notifies about all peers histories changes.
     * The events are arrays [peerId, messageNumIds (descending)]
     */
    historyChanges: globalChangeSubject,

    /**
     * Puts messages to the dialog messages history. Don't use it to put vagrant messages (e.g. replied to message).
     * You may put any messages, event that already exist in the history or the collection.
     * ⚠️ The messages MUST be from one peer
     * ⚠️ The messages MUST be sorted by id descending
     */
    putHistoryMessages(messages: Readonly<Message>[]) {
      if (!messages.length) {
        return;
      }

      const peer = messageToDialogPeer(messages[0]);
      if (!peer) {
        return;
      }

      const peerIndex = getOrCreatePeer(peerToId(peer));

      try {
        isUpdatingByThisIndex = true;
        collection.put(messages);
        peerIndex.putHistoryIds(messages.map((message) => message.id));
      } finally {
        isUpdatingByThisIndex = false;
      }
    },

    /**
     * Marks that the history of the given peer is loaded up to the end (the oldest message).
     * You can get this value later though isHistoryEnded.
     */
    pubHistoryComplete(peer: Peer, completed = true) {
      const peerId = peerToId(peer);
      const peerIndex = getOrCreatePeer(peerId);
      peerIndex.historyComplete = completed;
    },

    /**
     * The returned ids are in descending order (like the server returns).
     * ⚠️ Here and everywhere else the history is mutated by reference.
     */
    getHistory(peer: Peer, start?: number, end?: number): Readonly<number[]> {
      const peerId = peerToId(peer);
      const peerIndex = peers[peerId];
      if (!peerIndex) {
        return [];
      }
      return start === undefined && end === undefined
        ? peerIndex.historyIds
        : peerIndex.historyIds.slice(start, end);
    },

    getVagrant(peer: Peer): Readonly<number[]> {
      const peerId = peerToId(peer);
      const peerIndex = peers[peerId];
      if (!peerIndex) {
        return [];
      }

      const ids: number[] = [];
      peerIndex.vagrantIds.forEach((id) => ids.push(id));
      return ids;
    },

    isHistoryComplete(peer: Peer) {
      const peerId = peerToId(peer);
      const peerIndex = peers[peerId];
      return peerIndex ? peerIndex.historyComplete : false;
    },

    watchHistory(peer: Peer, onChange: HistoryWatcher): () => void {
      const peerId = peerToId(peer);
      let peerIndex = getOrCreatePeer(peerId);
      peerIndex.historyWatchers.push(onChange);

      return () => {
        peerIndex = peers[peerId];
        if (peerIndex) {
          const index = peerIndex.historyWatchers.indexOf(onChange);
          if (index >= 0) {
            peerIndex.historyWatchers.splice(index, 1);
            removePeerIfEmpty(peerId);
          }
        }
      };
    },

    /**
     * Makes a behavior subject that is updated only while the element is mounted for a history the given peer.
     * This subject can be subscribed on directly without memory leaks concerns.
     */
    useHistoryBehaviorSubject(base: unknown, peer: Peer): BehaviorSubject<Readonly<number[]>> {
      const subject = new BehaviorSubject(this.getHistory(peer));
      useWhileMounted(base, () => {
        subject.next(this.getHistory(peer));
        return this.watchHistory(peer, (history) => subject.next(history));
      });
      return subject;
    },
  };
}
