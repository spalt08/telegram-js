import { BehaviorSubject } from 'rxjs';
import debounceWithQueue from 'helpers/debounceWithQueue';
import { messageToDialogPeer, peerMessageToId } from 'helpers/api';
import client from 'client/client';
import { ContactsFound, Message, MessagesMessages, Peer } from 'client/schema';
import { chatCache, messageCache, userCache } from 'cache';
import { peerToInputPeer } from 'cache/accessors';

const LOAD_MESSAGES_CHUNK_LENGTH = 20;
const CONTACTS_SEARCH_MAX_COUNT = 10;
const SEARCH_REQUEST_DEBOUNCE = 500;

export type SearchRequest = string;

interface FilledQueryResponse {
  contactPeers: Peer[];
  globalPeers: Peer[];
  messageIds: string[];
  messageTotalCount: number;
  isMessageListFull: boolean;
}

export const enum SearchResultType {
  ForEmptyQuery,
  ForFilledQuery,
}

export interface EmptyQueryResult {
  request: SearchRequest;
  type: SearchResultType.ForEmptyQuery;
}

export interface FilledQueryResult extends FilledQueryResponse {
  request: SearchRequest;
  type: SearchResultType.ForFilledQuery;
}

export type SearchResult = EmptyQueryResult | FilledQueryResult;

export function areSearchRequestsEqual(request1: SearchRequest, request2: SearchRequest): boolean {
  return request1 === request2;
}

export function isSearchRequestEmpty(request: SearchRequest): boolean {
  return request.length === 0;
}

async function searchPeers(request: SearchRequest) {
  let data: ContactsFound;

  try {
    data = await client.call('contacts.search', { q: request, limit: CONTACTS_SEARCH_MAX_COUNT });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('Failed to search for contacts', error);
    }
    return {
      contacts: [],
      global: [],
    };
  }

  userCache.put(data.users);
  chatCache.put(data.chats);

  return {
    contacts: data.my_results,
    global: data.results,
  };
}

async function searchMessages(request: SearchRequest, offsetMessage: Exclude<Message, Message.messageEmpty> | null) {
  let data: MessagesMessages;

  try {
    data = await client.call('messages.searchGlobal', {
      q: request,
      offset_rate: offsetMessage ? offsetMessage.date : 0,
      offset_peer: offsetMessage ? peerToInputPeer(messageToDialogPeer(offsetMessage)) : { _: 'inputPeerEmpty' },
      offset_id: offsetMessage ? offsetMessage.id : 0,
      limit: LOAD_MESSAGES_CHUNK_LENGTH,
    });
  } catch (error) {
    if (error.message === 'SEARCH_QUERY_EMPTY') {
      return { ids: [], count: 0, isEnd: true };
    }

    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('Failed to search for messages globally', error);
    }
    return { ids: [], count: 0, isEnd: false };
  }

  if (data._ === 'messages.messagesNotModified') {
    throw Error(data._);
  }

  userCache.put(data.users);
  chatCache.put(data.chats);
  messageCache.put(data.messages);

  const ids: string[] = [];
  data.messages.forEach((message) => {
    if (message._ !== 'messageEmpty') {
      ids.push(peerMessageToId(messageToDialogPeer(message), message.id));
    }
  });
  const count = data._ === 'messages.messages' ? data.messages.length : data.count;
  const isEnd = data._ === 'messages.messages' || data.messages.length < LOAD_MESSAGES_CHUNK_LENGTH * 0.9; // Decrease just in case
  return { ids, count, isEnd };
}

const emptySearchRequest: SearchRequest = '';

export default class GlobalSearch {
  readonly result = new BehaviorSubject<SearchResult>({
    type: SearchResultType.ForEmptyQuery,
    request: emptySearchRequest,
  });

  readonly isSearching = new BehaviorSubject(false);

  readonly isLoadingMore = new BehaviorSubject(false);

  search(request: SearchRequest) {
    const isRequestEmpty = isSearchRequestEmpty(request);
    if (isRequestEmpty) {
      // todo: Force load the initial top contacts state
    }
    this.debouncedSearch.run(request, isRequestEmpty);
  }

  async loadMore() {
    const startResult = this.result.value;

    if (
      startResult.type !== SearchResultType.ForFilledQuery
      || startResult.isMessageListFull
      || !startResult.messageIds.length
      || this.isSearching.value // If the search process has started, it'll always lead to replacing the results list, so loading more is meaningless
      || this.isLoadingMore.value
    ) {
      return;
    }

    const lastMessage = messageCache.get(startResult.messageIds[startResult.messageIds.length - 1]);
    if (!lastMessage || lastMessage._ === 'messageEmpty') {
      return;
    }

    this.isLoadingMore.next(true);

    const loadedMessages = await searchMessages(startResult.request, lastMessage);
    const endResult = this.result.value;
    if (
      areSearchRequestsEqual(startResult.request, endResult.request)
      && endResult.type === SearchResultType.ForFilledQuery
    ) {
      this.result.next({
        ...endResult,
        messageIds: [...endResult.messageIds, ...loadedMessages.ids],
        messageTotalCount: loadedMessages.count || endResult.messageTotalCount,
        isMessageListFull: loadedMessages.isEnd,
      });
      this.isLoadingMore.next(false);
    }
  }

  protected performSearch = async (request: SearchRequest): Promise<FilledQueryResponse | null> => {
    if (isSearchRequestEmpty(request)) {
      return null;
    }
    const [peers, messages] = await Promise.all([
      searchPeers(request),
      searchMessages(request, null),
    ]);
    return {
      contactPeers: peers.contacts,
      globalPeers: peers.global,
      messageIds: messages.ids,
      messageTotalCount: messages.count,
      isMessageListFull: messages.isEnd,
    };
  };

  protected handleSearchResponse(request: SearchRequest, response: FilledQueryResponse | null) {
    if (response) {
      this.result.next({
        type: SearchResultType.ForFilledQuery,
        request,
        ...response,
      });
    } else {
      this.result.next({
        type: SearchResultType.ForEmptyQuery,
        request,
      });
    }
    this.isSearching.next(false);
    this.isLoadingMore.next(false);
  }

  protected debouncedSearch = debounceWithQueue<SearchRequest, FilledQueryResponse | null>({
    initialInput: emptySearchRequest,
    debounceTime: SEARCH_REQUEST_DEBOUNCE,
    performOnInit: false,
    shouldPerform(prevRequest, nextRequest) {
      return !areSearchRequestsEqual(prevRequest, nextRequest);
    },
    perform: this.performSearch,
    onStart: () => {
      this.isSearching.next(true);
    },
    onOutput: (request, response, isDebounceComplete) => {
      // Ignore the results that come before the final result that matches the latest request
      if (isDebounceComplete) {
        this.handleSearchResponse(request, response);
      }
    },
  });
}
