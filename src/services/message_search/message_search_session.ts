import { BehaviorSubject } from 'rxjs';
import client from 'client/client';
import { chatCache, messageCache, userCache } from 'cache';
import { Peer, MessagesSearch, MessagesFilter, MessagesMessages } from 'mtproto-js';
import { peerToInputPeer } from 'cache/accessors';
import { mergeOrderedArrays } from 'helpers/data';
import debounceWithQueue from '../../helpers/debounceWithQueue';

const LOAD_CHUNK_LENGTH = 20;
const SEARCH_REQUEST_DEBOUNCE = 500;

export type SearchRequest = string; // It may get other filter in future (e.g. date)

interface SearchResponse {
  ids: number[];
  count: number;
  isEnd: boolean;
}

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

export function isSearchRequestEmpty(request: SearchRequest): boolean {
  return request.length === 0;
}

async function makeSearchRequest(
  peer: Peer,
  request: SearchRequest,
  offsetMessageId: number | null,
): Promise<SearchResponse> {
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

  let data: MessagesMessages;

  try {
    // console.log('search request', parameters);
    data = await client.call('messages.search', parameters);
    // console.log('search response', data);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('Failed to search for messages', error);
    }
    return { ids: [], count: 0, isEnd: false };
  }

  if (data._ === 'messages.messagesNotModified') {
    throw Error(data._);
  }

  userCache.put(data.users);
  chatCache.put(data.chats);
  messageCache.put(data.messages);

  const messageIds = data.messages.map((message) => message.id);
  const count = data._ === 'messages.messages' ? data.messages.length : data.count;
  const isEnd = data._ === 'messages.messages' || data.messages.length < LOAD_CHUNK_LENGTH * 0.9; // Decrease just in case
  return { ids: messageIds, count, isEnd };
}

function responseToResult(request: SearchRequest, response: SearchResponse): SearchResult {
  return {
    request,
    ids: response.ids,
    count: response.count,
    isFull: response.isEnd,
  };
}

const emptySearchRequest: SearchRequest = '';

const emptySearchResponse: SearchResponse = {
  ids: [],
  count: 0,
  isEnd: true,
};

export const emptySearchResult = responseToResult(emptySearchRequest, emptySearchResponse);

export default function makeSearchSession(peer: Peer): SearchSession {
  let isDestroyed = false;
  const isSearching = new BehaviorSubject(false); // Includes the debounce time too
  const isLoadingMore = new BehaviorSubject(false);
  const result = new BehaviorSubject(emptySearchResult);

  const debouncedSearch = debounceWithQueue<SearchRequest, SearchResponse>({
    initialInput: emptySearchRequest,
    debounceTime: SEARCH_REQUEST_DEBOUNCE,
    performOnInit: false,
    shouldPerform(prevRequest, nextRequest) {
      return !areSearchRequestsEqual(prevRequest, nextRequest);
    },
    async perform(request) {
      if (isSearchRequestEmpty(request)) {
        return emptySearchResponse;
      }
      const response = await makeSearchRequest(peer, request, null);
      return response;
    },
    onStart() {
      isSearching.next(true);
    },
    onOutput(request, response, isDebounceComplete) {
      // Ignore the results that come before the final result that matches the latest request
      if (!isDebounceComplete) {
        return;
      }

      result.next(responseToResult(request, response));
      isSearching.next(false);
      isLoadingMore.next(false);
    },
  });

  function search(request: SearchRequest) {
    if (isDestroyed) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('Called `search` on a destroyed search session. Ignoring the call.');
      }
      return;
    }

    debouncedSearch.run(request, isSearchRequestEmpty(request));
  }

  async function loadMore() {
    if (isDestroyed) {
      if (process.env.NODE_ENV !== 'production') {
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

    const { ids: loadedIds, count: loadedCount, isEnd: isSearchEnd } = await makeSearchRequest(peer, startRequest, startIds[startIds.length - 1]);
    if (isDestroyed) {
      return;
    }
    const { ids: endIds, count: endCount, request: endRequest } = result.value;
    if (areSearchRequestsEqual(startRequest, endRequest)) {
      mergeOrderedArrays(endIds, loadedIds, (id1, id2) => id2 - id1);
      result.next({
        request: endRequest,
        ids: endIds,
        count: loadedCount || endCount,
        isFull: isSearchEnd,
      });
      isLoadingMore.next(false);
    }
  }

  function destroy() {
    if (isDestroyed) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('Called `destroy` on a destroyed search session. Ignoring the call.');
      }
      return;
    }

    isDestroyed = true;
    debouncedSearch.destroy();
  }

  return { result, isSearching, isLoadingMore, search, loadMore, destroy };
}
