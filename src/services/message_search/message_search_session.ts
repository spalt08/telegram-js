import { BehaviorSubject } from 'rxjs';
import client from 'client/client';
import { chatCache, messageCache, userCache } from 'cache';
import { Message, Peer, MessagesSearch, MessagesFilter } from 'cache/types';
import { peerToInputPeer } from 'cache/accessors';
import { mergeOrderedArrays } from 'helpers/data';

export type SearchRequest = string; // It may get other filter in future (e.g. date)

export interface SearchResult {
  request: SearchRequest; // For what request was this result obtained
  ids: number[]; // Message ids
  count: number; // Total found messages count
  isFull: boolean;
}

export interface SearchSession {
  readonly result: BehaviorSubject<SearchResult>;
  readonly isSearching: BehaviorSubject<boolean>;
  readonly isLoadingMore: BehaviorSubject<boolean>;
  search(request: SearchRequest): void;
  loadMore(): void;
  destroy(): void;
}

export function areSearchRequestsEqual(request1: SearchRequest, request2: SearchRequest): boolean {
  return request1 === request2;
}

export const emptySearchResult: SearchResult = {
  request: '',
  ids: [],
  count: 0,
  isFull: true,
};

export function isSearchRequestEmpty(request: SearchRequest): boolean {
  return request.length === 0;
}

const LOAD_CHUNK_LENGTH = 20;
const SEARCH_REQUEST_DEBOUNCE = 500;

async function makeSearchRequest(
  peer: Peer,
  request: SearchRequest,
  offsetMessageId: number | null,
): Promise<{messageIds: number[], count: number, isEnd: boolean}> {
  const filter: MessagesFilter = { _: 'inputMessagesFilterEmpty' };
  const parameters: MessagesSearch = {
    peer: peerToInputPeer(peer),
    q: request,
    filter,
    min_date: 0,
    max_date: 0,
    offset_id: offsetMessageId || 0,
    add_offset: 0,
    limit: LOAD_CHUNK_LENGTH,
    max_id: 0,
    min_id: 0,
    hash: 0,
  };

  // console.log('search request', parameters);
  try {
    const data = await client.callAsync('messages.search', parameters);
    // console.log('search response', err, data);

    if (data._ === 'messages.messagesNotModified') {
      throw Error(data._);
    }

    userCache.put(data.users);
    chatCache.put(data.chats);
    messageCache.put(data.messages);

    const messageIds = data.messages.map((message: Message) => message.id);
    const count = data._ === 'messages.messages'
      ? data.messages.length
      : data.count;
    const isEnd = data._ === 'messages.messages' || data.messages.length < LOAD_CHUNK_LENGTH * 0.9; // Decrease just in case
    return { messageIds, count, isEnd };
  } catch (err) {
    return { messageIds: [], count: 0, isEnd: false };
  }
}

export default function makeSearchSession(peer: Peer): SearchSession {
  let isDestroyed = false;
  let desiredRequest: SearchRequest = '';
  let searchStartTimeout: number = 0;
  let searchInProgress = false;

  const isSearching = new BehaviorSubject(false); // Includes the debounce time too
  const isLoadingMore = new BehaviorSubject(false);
  const result = new BehaviorSubject(emptySearchResult);

  async function repeatSearchWhileRequestIsChanging() {
    searchInProgress = true;
    while (searchInProgress) {
      const currentRequest = desiredRequest;
      // eslint-disable-next-line no-await-in-loop
      const { messageIds: ids, count, isEnd: isFull } = await makeSearchRequest(peer, desiredRequest, null);
      if (!searchInProgress) return;
      if (areSearchRequestsEqual(currentRequest, desiredRequest)) {
        searchInProgress = false;
        result.next({ request: currentRequest, ids, count, isFull });
        return;
      }
    }
  }

  function search(request: SearchRequest) {
    if (isDestroyed) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Called `search` on a destroyed search session. Ignoring the call.');
      }
      return;
    }

    if (areSearchRequestsEqual(request, desiredRequest)) {
      return;
    }

    desiredRequest = request;

    if (isSearchRequestEmpty(request)) {
      // Instant result when the request is empty
      searchInProgress = false;
      result.next({ request, ...emptySearchResult });
      if (isSearching.value) {
        isSearching.next(false);
      }
    } else {
      if (!isSearching.value) {
        isSearching.next(true);
      }

      // Actual search is in progress, it will research at the end automatically
      if (searchInProgress) {
        return;
      }

      clearTimeout(searchStartTimeout);
      searchStartTimeout = (setTimeout as typeof window.setTimeout)(async () => {
        // When the debounce ends, start an actual search that repeats unless the result request matches the desired request.
        // When it ends, the debounce will be available again.
        await repeatSearchWhileRequestIsChanging();
        isSearching.next(false);
      }, SEARCH_REQUEST_DEBOUNCE);
    }
  }

  async function loadMore() {
    if (isDestroyed) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Called `loadMore` on a destroyed search session. Ignoring the call.');
      }
      return;
    }

    const { isFull, ids: startIds, request: startRequest } = result.value;

    if (
      isFull
      || !startIds.length
      || isSearching.value // If the search process has started, it'll always lead to replacing the results list, so loading more is meaningless
      || isLoadingMore.value
    ) {
      return;
    }

    isLoadingMore.next(true);

    const { messageIds: loadedIds, isEnd: isSearchEnd } = await makeSearchRequest(peer, startRequest, startIds[startIds.length - 1]);
    if (isDestroyed) {
      return;
    }
    const { ids: endIds, count: endCount, request: endRequest } = result.value;
    if (areSearchRequestsEqual(startRequest, endRequest)) {
      mergeOrderedArrays(endIds, loadedIds, (id1, id2) => id2 - id1);
      result.next({
        request: endRequest,
        ids: endIds,
        count: endCount, // Use the previous count for a case of a loading error (in which case the `count` will be `0`)
        isFull: isSearchEnd,
      });
      isLoadingMore.next(false);
    }
  }

  function destroy() {
    if (isDestroyed) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Called `destroy` on a destroyed search session. Ignoring the call.');
      }
      return;
    }

    isDestroyed = true;
    searchInProgress = false;
    clearTimeout(searchStartTimeout);
  }

  return { result, isSearching, isLoadingMore, search, loadMore, destroy };
}
