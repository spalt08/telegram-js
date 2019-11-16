import binarySearch from 'binary-search';
import { messageToDialogPeer, peerToId } from 'helpers/api';
import { Message, Peer } from '../../types';
import Collection from '../collection';

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
   * The messages got from other sources (e.g. replied to messages). Their positions in the history is unknown.
   * An id may be only in one of the lists (preferable in `historyIds`).
   */
  public vagrantIds = new Set<number>();

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
}

/**
 * Indexes messages by peers. Also keeps the history order.
 */
export default function messagesByPeers(collection: Collection<Message, any>) {
  const peers = {} as Record<string, PeerIndex>;
  let isUpdatingByThisIndex = false;

  function getOrCreatePeer(peerId: string) {
    if (!peers[peerId]) {
      peers[peerId] = new PeerIndex();
    }
    return peers[peerId];
  }

  collection.changes.subscribe((collectionChanges) => {
    if (isUpdatingByThisIndex) {
      return;
    }

    collectionChanges.forEach(([action, message]) => {
      const peerObject = messageToDialogPeer(message);
      if (!peerObject) {
        return;
      }

      const peerId = peerToId(peerObject);

      switch (action) {
        case 'add': {
          getOrCreatePeer(peerId).putVagrantId(message.id);
          break;
        }
        case 'remove': {
          if (peers[peerId]) {
            peers[peerId].removeHistoryId(message.id);
            peers[peerId].removeVagrantId(message.id);
            if (peers[peerId].isEmpty()) {
              delete peers[peerId];
            }
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
     * Puts messages to the dialog messages history. Don't use it to put vagrant messages (e.g. replied to message).
     * You may put any messages, event that already exist in the history or the collection.
     * ⚠️ The messages MUST be from one peer
     * ⚠️ The messages MUST be sorted by id descending
     */
    putHistoryMessages(messages: Readonly<Message>[]) {
      if (!messages.length) {
        return;
      }

      const peerObject = messageToDialogPeer(messages[0]);
      if (!peerObject) {
        return;
      }

      const peer = getOrCreatePeer(peerToId(peerObject));

      try {
        isUpdatingByThisIndex = true;
        collection.put(messages);
        peer.putHistoryIds(messages.map((message) => message.id));
      } finally {
        isUpdatingByThisIndex = false;
      }
    },

    /**
     * The returned ids are in descending order (like the server returns)
     */
    getHistoryIds(peerObject: Peer, start?: number, end?: number): number[] {
      const peerId = peerToId(peerObject);
      const peer = peers[peerId];
      if (!peer) {
        return [];
      }
      return start === undefined && end === undefined
        ? peer.historyIds
        : peer.historyIds.slice(start, end);
    },

    getVagrantIds(peerObject: Peer): number[] {
      const peerId = peerToId(peerObject);
      const peer = peers[peerId];
      if (!peer) {
        return [];
      }

      const ids: number[] = [];
      peer.vagrantIds.forEach((id) => ids.push(id));
      return ids;
    },
  };
}
