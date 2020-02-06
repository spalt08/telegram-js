import { BehaviorSubject, Subject } from 'rxjs';
import binarySearch from 'binary-search';
import { messageToDialogPeer, peerToId } from 'helpers/api';
import { mergeOrderedArrays } from 'helpers/data';
import { useWhileMounted } from 'core/hooks';
import { Message, Peer } from '../../types';
import Collection from '../collection';

type HistoryWatcher = (ids: Readonly<number[]>) => void;

export interface IdsChunkReference {
  readonly history: BehaviorSubject<IdsChunk>;

  // The chunk must intersect or directly touch the referenced chunk
  putChunk(chunk: IdsChunk): void;

  // You must call when you don't want to watch the chunk anymore
  revoke(): void;
}

export interface IdsChunk {
  ids: number[];
  oldestReached?: boolean;
  newestReached?: boolean;
}

interface IdsChunkStore {
  oldestReached: boolean;
  newestReached: boolean;
  ids: number[];
  refs: IdsChunkReference[];
}

// todo: Add messages from migrated chats to the corresponding groups. Migrated chats are marked with migrated_to attribute.

// See Array.prototype.sort
function compareIdsForOrder(id1: number, id2: number) {
  return id2 - id1;
}

function isChunkEmpty(chunk: IdsChunk) {
  return !chunk.newestReached && !chunk.oldestReached && !chunk.ids.length;
}

function getChunkNewestId(chunk: IdsChunk) {
  if (chunk.newestReached) {
    return Infinity;
  }
  return chunk.ids.length ? chunk.ids[0] : -Infinity;
}

function getChunkOldestId(chunk: IdsChunk) {
  if (chunk.oldestReached) {
    return -Infinity;
  }
  return chunk.ids.length ? chunk.ids[chunk.ids.length - 1] : Infinity;
}

// id = Infinity refers to the chunk with the newest message, -Infinity to the chunk with the oldest
function compareChunksAndIdForOrder(chunk: IdsChunk, id: number): number {
  if (isChunkEmpty(chunk)) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Unexpected empty chunk (no ids and not oldest or newest)');
    }
    return -1;
  }
  if (compareIdsForOrder(getChunkNewestId(chunk), id) > 0) {
    return 1;
  }
  if (compareIdsForOrder(getChunkOldestId(chunk), id) < 0) {
    return -1;
  }
  return 0;
}

// integer means the exact position, float means the position between positions floor(n) and ceil(n)
function findInIdsList(ids: number[], id: number): number {
  const rawValue = binarySearch(ids, id, compareIdsForOrder);
  return rawValue >= 0 ? rawValue : (-rawValue - 1.5);
}

// integer means the exact position, float means the position between positions floor(n) and ceil(n)
function findChunkWithMessage(chunks: IdsChunk[], messageId: number): number {
  const rawValue = binarySearch(chunks, messageId, compareChunksAndIdForOrder);
  return rawValue >= 0 ? rawValue : (-rawValue - 1.5);
}

class PeerIndex {
  /**
   * Each chunk is a continuous sequence of ids that has no missing id in between.
   * The chunks and the ids inside are in descending order.
   * The intersecting chunks must be combined into a single chunk. Touching chunks _should_ be too.
   * There are no empty chunks.
   * There are only unique ids inside.
   */
  public chunks: IdsChunkStore[] = [];

  public isEmpty() {
    const { chunks } = this;
    return !(chunks.length === 1 && chunks[0].newestReached && chunks[0].oldestReached)
      && chunks.reduce((idsCount, chunk) => idsCount + chunk.ids.length, 0) === 0;
  }

  public hasReferences() {
    return this.chunks.some((chunk) => chunk.refs.length);
  }

  // ids are in descending order and with no missing ids in between
  public putChunk(chunkRef: IdsChunkReference, chunk: IdsChunk) {
    if (isChunkEmpty(chunk)) {
      return;
    }

    const targetChunkIndex = this.chunks.findIndex((_chunk) => _chunk.refs.includes(chunkRef));
    let newestChunkIndex = Math.ceil(findChunkWithMessage(this.chunks, getChunkNewestId(chunk)));
    let oldestChunkIndex = Math.floor(findChunkWithMessage(this.chunks, getChunkOldestId(chunk)));

    if (targetChunkIndex >= 0) {
      newestChunkIndex = Math.min(targetChunkIndex, newestChunkIndex);
      oldestChunkIndex = Math.max(targetChunkIndex, oldestChunkIndex);
    }

    let isChanged = false;

    // Combine the chunks that intersect with the given ids in a single chunk
    // If no chunk intersects, then the combined chunk will be empty
    const chunksToCombine = this.chunks.slice(newestChunkIndex, oldestChunkIndex + 1);
    let newChunk: IdsChunkStore;
    if (chunksToCombine.length === 1) {
      [newChunk] = chunksToCombine;
    } else {
      newChunk = {
        ids: [],
        refs: [],
        oldestReached: false,
        newestReached: false,
      };
      chunksToCombine.forEach((_chunk) => {
        newChunk.ids.push(..._chunk.ids);
        newChunk.refs.push(..._chunk.refs);
        newChunk.oldestReached = newChunk.oldestReached || _chunk.oldestReached;
        newChunk.newestReached = newChunk.newestReached || _chunk.newestReached;
      });
      isChanged = true;
    }

    // Merge the given ids and data with the combined chunk to fill its gaps
    if (mergeOrderedArrays(newChunk.ids, chunk.ids, compareIdsForOrder)) {
      isChanged = true;
    }
    if (chunk.oldestReached && !newChunk.oldestReached) {
      newChunk.oldestReached = true;
      isChanged = true;
    }
    if (chunk.newestReached && !newChunk.newestReached) {
      newChunk.newestReached = true;
      isChanged = true;
    }

    if (isChanged) {
      // Put the result chunk to its place in the chunks list
      this.chunks.splice(newestChunkIndex, oldestChunkIndex - newestChunkIndex + 1, newChunk);

      // Notify listeners about the changes
      newChunk.refs.forEach((ref) => ref.history.next({
        ids: newChunk.ids,
        newestReached: newChunk.newestReached,
        oldestReached: newChunk.oldestReached,
      }));
    }

    // If the given chunk wasn't attached to the chunk, attach it and give the current chunk state
    if (targetChunkIndex < 0) {
      this.attachChunkReference(chunkRef, newChunk);
    }
  }

  public removeId(messageId: number) {
    const chunkIndex = findChunkWithMessage(this.chunks, messageId);
    if (chunkIndex % 1 !== 0) {
      return;
    }
    const chunk = this.chunks[chunkIndex];
    const idIndex = findInIdsList(chunk.ids, messageId);
    if (idIndex % 1 !== 0) {
      return;
    }
    chunk.ids.splice(idIndex, 1);
    if (isChunkEmpty(chunk)) {
      this.chunks.splice(chunkIndex, 1);
    }
    chunk.refs.forEach((ref) => ref.history.next({
      ids: [],
      oldestReached: false,
      newestReached: false,
    }));
  }

  public makeChunkReference(existingMessageId?: number): IdsChunkReference {
    const chunkReference: IdsChunkReference = {
      history: new BehaviorSubject({ ids: [] }),
      putChunk: (chunk) => this.putChunk(chunkReference, chunk),
      revoke: () => this.chunks.forEach((chunk) => {
        const refIndex = chunk.refs.indexOf(chunkReference);
        if (refIndex >= 0) {
          chunk.refs.splice(refIndex, 1);
        }
      }),
    };

    if (existingMessageId === Infinity) {
      this.putChunk(chunkReference, { ids: [], newestReached: true });
    } else if (existingMessageId === -Infinity) {
      this.putChunk(chunkReference, { ids: [], oldestReached: true });
    } else if (existingMessageId) {
      const chunkIndex = findChunkWithMessage(this.chunks, existingMessageId);
      if (chunkIndex % 1 === 0) {
        this.attachChunkReference(chunkReference, this.chunks[chunkIndex]);
      }
    }

    return chunkReference;
  }

  protected attachChunkReference(chunkRef: IdsChunkReference, chunk: IdsChunkStore) {
    if (!chunk.refs.includes(chunkRef)) {
      chunk.refs.push(chunkRef);
      chunkRef.history.next({
        ids: chunk.ids,
        oldestReached: chunk.oldestReached,
        newestReached: chunk.newestReached,
      });
    }
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

    // todo: Chunk the changes
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
    putHistoryComplete(peer: Peer, completed = true) {
      const peerId = peerToId(peer);
      const peerIndex = getOrCreatePeer(peerId);
      peerIndex.oldestReached = completed;
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
      return peerIndex ? peerIndex.oldestReached : false;
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
