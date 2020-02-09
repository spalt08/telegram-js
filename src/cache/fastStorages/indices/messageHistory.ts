import { BehaviorSubject, Subject } from 'rxjs';
import binarySearch from 'binary-search';
import { messageToDialogPeer, peerToId } from 'helpers/api';
import { mergeOrderedArrays } from 'helpers/data';
import { Message, Peer } from '../../types';
import Collection from '../collection';

interface IdsChunkReference {
  readonly history: BehaviorSubject<IdsChunk>;

  // The chunk must intersect or directly touch the referenced chunk
  putChunk(chunk: IdsChunk): void;

  // You should call when you don't want to watch the chunk anymore
  revoke(): void;
}

export interface IdsChunk {
  // Ids in descending order without missing ids in between
  readonly ids: Readonly<number[]>;
  // Set to true if you know that these ids are the oldest for the peer
  readonly oldestReached?: boolean;
  // Set to true if you know that these ids are the newest for the peer so far
  readonly newestReached?: boolean;
}

interface IdsChunkStore {
  ids: number[];
  oldestReached: boolean;
  newestReached: boolean;
  refs: IdsChunkReference[];
}

export interface MessagesChunk extends Omit<IdsChunk, 'ids'> {
  /**
   * ⚠️ Watch the the messages peer matches the chunk peer
   * In descending order with no missing messages in between
   */
  readonly messages: Readonly<Message>[];
}

export interface MessagesChunkReference extends Omit<IdsChunkReference, 'putChunk'> {
  putChunk(chunk: MessagesChunk): void;
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

function idsChunkStoreToChunk(chunk: IdsChunkStore): IdsChunk {
  return {
    ids: chunk.ids,
    oldestReached: chunk.oldestReached,
    newestReached: chunk.newestReached,
  };
}

class PeerIndex {
  /**
   * Each chunk is a continuous sequence of ids that has no missing id in between.
   * The chunks and the ids inside are in descending order.
   * The intersecting chunks must be combined into a single chunk. Touching chunks _should_ be too.
   * There are no empty chunks.
   * There are only unique ids inside.
   */
  protected chunks: IdsChunkStore[] = [];

  public isEmpty() {
    const { chunks } = this;
    return !(chunks.length === 1 && chunks[0].newestReached && chunks[0].oldestReached)
      && chunks.reduce((idsCount, chunk) => idsCount + chunk.ids.length, 0) === 0;
  }

  public countReferences() {
    return this.chunks.reduce((sum, chunk) => sum + chunk.refs.length, 0);
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
      const chunkData = idsChunkStoreToChunk(newChunk);
      newChunk.refs.forEach((ref) => ref.history.next(chunkData));
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
    const chunkData = idsChunkStoreToChunk(chunk);
    chunk.refs.forEach((ref) => ref.history.next(chunkData));
  }

  public makeChunkReference(targetMessageId?: number): IdsChunkReference {
    const chunkReference = {
      isRevoked: false,
      history: new BehaviorSubject({ ids: [] }),
      putChunk: (chunk: IdsChunk) => {
        if (chunkReference.isRevoked) {
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error('Called `putChunk` on a revoked chunk reference. The call is ignored.');
          }
          return;
        }
        this.putChunk(chunkReference, chunk);
      },
      revoke: () => {
        if (!chunkReference.isRevoked) {
          this.chunks.forEach((chunk) => {
            const refIndex = chunk.refs.indexOf(chunkReference);
            if (refIndex >= 0) {
              chunk.refs.splice(refIndex, 1);
            }
          });
          chunkReference.isRevoked = true;
        }
      },
    };

    if (targetMessageId === Infinity) {
      this.putChunk(chunkReference, { ids: [], newestReached: true });
    } else if (targetMessageId === -Infinity) {
      this.putChunk(chunkReference, { ids: [], oldestReached: true });
    } else if (targetMessageId) {
      const chunkIndex = findChunkWithMessage(this.chunks, targetMessageId);
      if (chunkIndex % 1 === 0) {
        this.attachChunkReference(chunkReference, this.chunks[chunkIndex]);
      }
    }

    return chunkReference;
  }

  protected attachChunkReference(chunkRef: IdsChunkReference, chunk: IdsChunkStore) {
    if (!chunk.refs.includes(chunkRef)) {
      chunk.refs.push(chunkRef);
      chunkRef.history.next(idsChunkStoreToChunk(chunk));
    }
  }
}

/**
 * Stores chunks of messages history (in the descending order (new first)).
 */
export default function messageHistory(collection: Collection<Message, any>) {
  const peers = {} as Record<string, {
    index: PeerIndex,
    newestRef: IdsChunkReference,
  }>;
  const newestMessagesSubject = new Subject<[string, number]>();
  let isUpdatingByThisIndex = false;

  function getOrCreatePeer(peerId: string) {
    if (!peers[peerId]) {
      const index = new PeerIndex();
      const newestRef = index.makeChunkReference(Infinity);
      newestRef.history.subscribe(({ ids }) => {
        if (ids.length) {
          newestMessagesSubject.next([peerId, ids[0]]);
        }
      });
      peers[peerId] = { index, newestRef };
    }
    return peers[peerId];
  }

  function removePeerIfEmpty(peerId: string) {
    if (peers[peerId]) {
      const { index, newestRef } = peers[peerId];
      // 1 reference is the global newest messages references
      if (index.isEmpty() && index.countReferences() <= 1) {
        newestRef.revoke();
        delete peers[peerId];
      }
    }
  }

  collection.changes.subscribe((collectionChanges) => {
    if (isUpdatingByThisIndex) {
      return;
    }

    // todo: Batch the changes
    collectionChanges.forEach(([action, message]) => {
      if (action === 'remove') {
        const peer = messageToDialogPeer(message);
        if (!peer) {
          return;
        }

        const peerId = peerToId(peer);

        if (peers[peerId]) {
          peers[peerId].index.removeId(message.id);
          removePeerIfEmpty(peerId);
        }
      }

      // No `add` because we don't need to store vagrant ids
      // No `update` because we assume that a message can't change the id or peer
    });
  });

  return {
    // todo remove debug
    peers,

    /**
     * Notifies about incoming new messages in all the peers.
     * The events are arrays [peerId, messageNumId]
     */
    newestMessages: newestMessagesSubject,

    /**
     * Puts a new (the most recent for a peer) message to the storage and the index
     */
    putNewestMessage(message: Readonly<Message>) {
      const peer = messageToDialogPeer(message);
      if (!peer) {
        return;
      }

      const { newestRef } = getOrCreatePeer(peerToId(peer));

      try {
        isUpdatingByThisIndex = true;
        collection.put(message);
        newestRef.putChunk({
          ids: [message.id],
          newestReached: true,
        });
      } finally {
        isUpdatingByThisIndex = false;
      }
    },

    /**
     * Makes a reference that allow to get the messages from the chunk, watch them and put new messages into it.
     *
     * @param targetMessageId The id of the message that the given chunk must contain. Examples:
     *  - If you want to work with messages around the found or replied message, give its id;
     *  - If you want to work with the newest messages, give `Infinity`;
     *  - If you want to work with the oldest messages, give `-Infinity`;
     */
    makeChunkReference(peer: Peer, targetMessageId?: number): MessagesChunkReference {
      const peerId = peerToId(peer);
      const { index: peerIndex } = getOrCreatePeer(peerId);

      const idsChunkReference = peerIndex.makeChunkReference(targetMessageId);

      const messagesChunkReference = {
        isRevoked: false,
        history: idsChunkReference.history,
        putChunk(chunk: MessagesChunk) {
          try {
            isUpdatingByThisIndex = true;

            if (messagesChunkReference.isRevoked) {
              if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.error('Called `putChunk` on a revoked chunk reference. The call is ignored.');
              }
              return;
            }

            if (process.env.NODE_ENV === 'development') {
              chunk.messages.forEach((message, messageIndex) => {
                const messagePeer = messageToDialogPeer(message);
                if (!messagePeer) {
                  return;
                }

                const messagePeerId = peerToId(peer);
                if (messagePeerId !== peerId) {
                  // eslint-disable-next-line no-console
                  console.error('Called `putChunk` with a message of a wrong peer', {
                    chunkPeer: peer,
                    messagePeer,
                    messageIndex,
                    message,
                  });
                }
              });
            }

            collection.put(chunk.messages);
            idsChunkReference.putChunk({
              ...chunk,
              ids: chunk.messages.map((message) => message.id),
            });
          } finally {
            isUpdatingByThisIndex = false;
          }
        },
        revoke() {
          if (!messagesChunkReference.isRevoked) {
            idsChunkReference.revoke();
            removePeerIfEmpty(peerId);
            messagesChunkReference.isRevoked = true;
          }
        },
      };

      return messagesChunkReference;
    },
  };
}
