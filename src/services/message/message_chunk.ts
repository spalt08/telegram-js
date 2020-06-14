import { BehaviorSubject } from 'rxjs';
import { IdsChunk, MessageHistoryIndex, MessagesChunk } from 'cache/fastStorages/indices/messageHistory';
import { MessagesFilter, Peer } from 'mtproto-js';
import { Direction, MessageFilterData } from './types';
import { LOAD_CHUNK_LENGTH, loadContinuousMessages } from './helpers';

export interface MessageHistoryChunk extends IdsChunk {
  readonly loadingNewer?: boolean;
  readonly loadingOlder?: boolean;
}

export interface MessageChunkService {
  readonly history: BehaviorSubject<MessageHistoryChunk>;

  // Returns <0 if the message is older than chunk, =0 if inside chunk, >0 if newer than chunk, null when unknown.
  getMessageRelation(messageId: number): number | null;

  /**
   * Look for the sibling message id in the `history.value.ids` field.
   * `undefined` means that the sibling message hasn't been loaded yet and you need to call `loadMore()` to get it.
   * `false` means that there is no sibling message (the given message is the newest/oldest).
   *
   * `offset` is how far sibling you need; 0 is the given id, 1 (default value) is the closest sibling and so on.
   */
  getNewerId(id: number, offset?: number): number | undefined | false;
  getOlderId(id: number, offset?: number): number | undefined | false;

  loadMore(direction: Direction.Newer | Direction.Older): void;

  // Also makes sure that the `history` subject won't be updated
  destroy(): void;
}

/**
 * Drives 1 chunk of a message history.
 *
 * Tip: give messageId = Infinity to make a chunk of the newest messages.
 *
 * If you need a chunk for all messages, set `cacheIndex` to `messageCache.indices.history`.
 * If you need a chunk for filtered messages, create a custom message history index and set it to `cacheIndex`.
 *
 * `subFilters` can be used to automatically add loaded messages to other filtered message history caches.
 */
export default function makeMessageChunk(
  peer: Peer,
  messageId: Exclude<number, 0>,
  cacheIndex: MessageHistoryIndex,
  filter?: Readonly<MessagesFilter>,
  subFilters: readonly Pick<MessageFilterData, 'cacheIndex' | 'runtimeFilter'>[] = [],
): MessageChunkService {
  let isDestroyed = false;
  let isUpdatingCacheChunk = false;

  const historySubject = new BehaviorSubject<MessageHistoryChunk>({ ids: [] });

  const cacheChunkRef = cacheIndex.makeChunkReference(peer, messageId);
  const cacheSubscription = cacheChunkRef.history.subscribe((chunk) => {
    if (!isUpdatingCacheChunk) {
      historySubject.next({
        ...historySubject.value,
        ...chunk,
      });
    }
  });

  const subCacheChunkRefs = subFilters.map((subFilter) => subFilter.cacheIndex.makeChunkReference(peer, messageId));

  async function loadMessages(direction: Direction, fromId?: number, toId?: number) {
    if (
      ((direction === Direction.Around || direction === Direction.Older) && historySubject.value.loadingOlder)
      || ((direction === Direction.Around || direction === Direction.Newer) && historySubject.value.loadingNewer)
    ) {
      return;
    }

    try {
      historySubject.next({
        ...historySubject.value,
        loadingOlder: direction === Direction.Around || direction === Direction.Older ? true : historySubject.value.loadingOlder,
        loadingNewer: direction === Direction.Around || direction === Direction.Newer ? true : historySubject.value.loadingNewer,
      });

      let result: MessagesChunk;
      try {
        result = await loadContinuousMessages(peer, direction, fromId, toId, filter);
      } catch (err) {
        if (!isDestroyed && process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('Failed to load messages history part', { peer, direction, fromId, toId, err });
        }
        return;
      }

      if (isDestroyed) {
        return;
      }

      try {
        isUpdatingCacheChunk = true;
        cacheChunkRef.putChunk(result);
      } finally {
        isUpdatingCacheChunk = false;
      }

      // Add the loaded messages to the filtered history caches
      subCacheChunkRefs.forEach((subCacheChunkRef, index) => {
        const { runtimeFilter } = subFilters[index];
        subCacheChunkRef.putChunk({
          ...result,
          messages: result.messages.filter(runtimeFilter),
        });
      });
    } finally {
      if (!isDestroyed) {
        historySubject.next({
          ...cacheChunkRef.history.value,
          loadingOlder: direction === Direction.Around || direction === Direction.Older ? false : historySubject.value.loadingOlder,
          loadingNewer: direction === Direction.Around || direction === Direction.Newer ? false : historySubject.value.loadingNewer,
        });
      }
    }
  }

  function loadMore(direction: Direction.Newer | Direction.Older) {
    if (isDestroyed) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('Called `loadMore` on a destroyed message chunk. Ignoring the call.');
      }
      return;
    }

    const history = cacheChunkRef.history.value;
    switch (direction) {
      case Direction.Newer:
        if (!history.newestReached) {
          const offset_id = history.ids[0];
          loadMessages(Direction.Newer, offset_id);
        }
        break;
      case Direction.Older:
        if (!history.oldestReached) {
          const offset_id = history.ids[history.ids.length - 1];
          loadMessages(Direction.Older, offset_id);
        }
        break;
      default:
    }
  }

  function getSiblingId(id: number, oldness: number) {
    const idIndex = cacheChunkRef.getMessageIndex(id);
    const siblingIndex = oldness >= 0 ? Math.floor(idIndex) + oldness : Math.ceil(idIndex) + oldness;
    const history = cacheChunkRef.history.value;
    if (siblingIndex < 0) {
      return history.newestReached ? false : undefined;
    }
    if (siblingIndex >= history.ids.length) {
      return history.oldestReached ? false : undefined;
    }
    return history.ids[siblingIndex];
  }

  function destroy() {
    if (isDestroyed) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('Called `destroy` on a destroyed message chunk. Ignoring the call.');
      }
      return;
    }

    isDestroyed = true;
    cacheSubscription.unsubscribe();
    cacheChunkRef.revoke();
  }

  function makeSureChunkHasMessages() {
    const { ids, newestReached, oldestReached } = cacheChunkRef.history.value;

    if (messageId === Infinity) {
      if (ids.length < LOAD_CHUNK_LENGTH && !oldestReached) {
        loadMessages(Direction.Older, ids.length ? ids[ids.length - 1] : undefined);
      }
      return;
    }

    if (messageId === -Infinity) {
      if (ids.length < LOAD_CHUNK_LENGTH && !newestReached) {
        loadMessages(Direction.Older, ids.length ? ids[0] : undefined);
      }
      return;
    }

    const messageIndex = cacheChunkRef.getMessageIndex(messageId);
    const minSideCount = Math.floor(LOAD_CHUNK_LENGTH / 2) - 1;
    if (
      (messageIndex < minSideCount && !newestReached)
      || (ids.length - messageIndex - 1 < minSideCount && !oldestReached)
    ) {
      loadMessages(Direction.Around, messageId);
    }
  }

  makeSureChunkHasMessages();

  return {
    history: historySubject,
    loadMore,
    getMessageRelation: cacheChunkRef.getMessageRelation,
    getNewerId(id, offset = 1) {
      return getSiblingId(id, -offset);
    },
    getOlderId(id, offset = 1) {
      return getSiblingId(id, offset);
    },
    destroy,
  };
}
