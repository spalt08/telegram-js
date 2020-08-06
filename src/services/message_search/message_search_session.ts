import { BehaviorSubject } from 'rxjs';
import client from 'client/client';
import { chatCache, messageCache, userCache } from 'cache';
import { Peer, MessagesSearch, MessagesFilter, MessagesMessages } from 'mtproto-js';
import { peerToInputPeer } from 'cache/accessors';
import { mergeOrderedArrays } from 'helpers/data';
import SearchDriver from 'helpers/searchDriver';
import { map } from 'rxjs/operators';

const LOAD_CHUNK_LENGTH = 20;

export type SearchRequest = string; // It may get other filter in future (e.g. date)

interface SearchResponse {
  ids: number[];
  count: number;
  isEnd: boolean;
}

export interface SearchResult {
  peer: Readonly<Peer>;
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
}

export function areSearchRequestsEqual(request1: SearchRequest, request2: SearchRequest): boolean {
  return request1.trim() === request2.trim();
}

export function isSearchRequestEmpty(request: SearchRequest): boolean {
  return request.trim().length === 0;
}

async function makeSearchRequest(
  peer: Readonly<Peer>,
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

function responseToResult(peer: Readonly<Peer>, request: SearchRequest, response: SearchResponse): SearchResult {
  return {
    peer,
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

export const emptySearchResult = responseToResult({ _: 'peerUser', user_id: 0 }, emptySearchRequest, emptySearchResponse);

export default function makeSearchSession(peer: Readonly<Peer>): SearchSession {
  const resultSubject = new BehaviorSubject<SearchResult>(responseToResult(peer, emptySearchRequest, emptySearchResponse));

  const searchDriver = new SearchDriver<SearchRequest, Omit<SearchResponse, 'isEnd'>>({
    isRequestEmpty: isSearchRequestEmpty,
    areRequestEqual: areSearchRequestsEqual,
    async performSearch(request, pageAfter?) {
      let ids = pageAfter?.ids;
      const response = await makeSearchRequest(peer, request, ids ? ids[ids.length - 1] : null);
      if (ids) {
        mergeOrderedArrays(ids, response.ids, (id1, id2) => id2 - id1);
      } else {
        ids = response.ids;
      }
      return {
        result: {
          ids,
          count: response.count || pageAfter?.count || 0,
        },
        isEnd: response.isEnd,
      };
    },
  });

  searchDriver.result
    .pipe(map(([request, result = emptySearchResponse, isEnd]) => responseToResult(peer, request, { ...result, isEnd })))
    .subscribe(resultSubject);

  return {
    search: searchDriver.search.bind(searchDriver),
    loadMore: searchDriver.loadMore.bind(searchDriver),
    result: resultSubject,
    isSearching: searchDriver.isSearching,
    isLoadingMore: searchDriver.isLoadingMore,
  };
}
