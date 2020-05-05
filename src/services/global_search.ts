import { BehaviorSubject, combineLatest, Subscription } from 'rxjs';
import { first, map } from 'rxjs/operators';
import debounceWithQueue from 'helpers/debounceWithQueue';
import { arePeersSame, messageToDialogPeer, peerMessageToId, peerToId } from 'helpers/api';
import client from 'client/client';
import { ContactsFound, Message, MessagesMessages, Peer } from 'mtproto-js';
import { chatCache, dialogCache, messageCache, userCache } from 'cache';
import { peerToInputPeer } from 'cache/accessors';
import TopUsersService from './top_users';
import DialogsService from './dialog/dialog';

const loadMessagesChunkLength = 20;
const contactsSearchMaxCount = 10;
const searchRequestDebounce = 250;
const maxRecentPeersCount = 20;
const maxRecentPeersFromDialogsCount = 6;

export type SearchRequest = string;

interface EmptyQueryResponse {
  type: SearchResultType.ForEmptyQuery;
}

interface FilledQueryResponse {
  type: SearchResultType.ForFilledQuery;
  contactPeers: readonly Peer[];
  globalPeers: readonly Peer[];
  messageIds: readonly string[];
  messageTotalCount: number;
  isMessageListFull: boolean;
}

type SearchResponse = EmptyQueryResponse | FilledQueryResponse;

export const enum SearchResultType {
  ForEmptyQuery,
  ForFilledQuery,
}

export interface EmptyQueryResult extends EmptyQueryResponse {
  request: SearchRequest;
  topUsers: readonly Peer[],
  recentPeers: readonly Peer[],
}

export interface FilledQueryResult extends FilledQueryResponse {
  request: SearchRequest;
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
    data = await client.call('contacts.search', { q: request, limit: contactsSearchMaxCount });
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
      limit: loadMessagesChunkLength,
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
  const isEnd = data._ === 'messages.messages' || data.messages.length < loadMessagesChunkLength * 0.9; // Decrease just in case
  return { ids, count, isEnd };
}

export default class GlobalSearch {
  readonly result = new BehaviorSubject<SearchResult>({
    type: SearchResultType.ForEmptyQuery,
    request: '',
    topUsers: [],
    recentPeers: [],
  });

  readonly recentPeers = new BehaviorSubject<readonly Peer[]>([]);

  readonly isSearching = new BehaviorSubject(false);

  readonly isLoadingMore = new BehaviorSubject(false);

  protected sourceSubscriptions: Subscription[] = [];

  constructor(protected topUsers: TopUsersService, dialogs?: DialogsService) {
    if (dialogs) {
      // todo: Keep the recent peers in a persistent storage instead of getting from the dialogs
      this.addRecentPeersFromDialogs(dialogs);
    }
  }

  search(request: SearchRequest) {
    this.debouncedSearch.run(request, isSearchRequestEmpty(request));
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

  addRecentPeer(peer: Peer) {
    const recentPeers = this.recentPeers.value;
    const currentIndex = recentPeers.findIndex((_peer) => arePeersSame(_peer, peer));

    if (currentIndex === 0) {
      return;
    }

    this.recentPeers.next(currentIndex === -1 ? [
      peer,
      ...recentPeers.slice(0, maxRecentPeersCount - 1),
    ] : [
      peer,
      ...recentPeers.slice(0, currentIndex),
      ...recentPeers.slice(currentIndex + 1),
    ]);
  }

  protected async performSearch(request: SearchRequest): Promise<SearchResponse> {
    if (isSearchRequestEmpty(request)) {
      await this.topUsers.updateIfRequired();
      return { type: SearchResultType.ForEmptyQuery };
    }

    const [peers, messages] = await Promise.all([
      searchPeers(request),
      searchMessages(request, null),
    ]);
    return {
      type: SearchResultType.ForFilledQuery,
      contactPeers: peers.contacts,
      globalPeers: peers.global,
      messageIds: messages.ids,
      messageTotalCount: messages.count,
      isMessageListFull: messages.isEnd,
    };
  }

  protected handleSearchResponse(request: SearchRequest, response: SearchResponse) {
    this.unwatchSources();

    switch (response.type) {
      case SearchResultType.ForEmptyQuery:
        this.watchEmptySearchSources(request);
        break;
      case SearchResultType.ForFilledQuery:
        this.result.next({ request, ...response });
        break;
      default:
    }

    this.isSearching.next(false);
    this.isLoadingMore.next(false);
  }

  protected debouncedSearch = debounceWithQueue<SearchRequest | null, SearchResponse | null>({
    initialInput: null,
    debounceTime: searchRequestDebounce,
    performOnInit: false,
    shouldPerform(prevRequest, nextRequest) {
      if (prevRequest === null || nextRequest === null) {
        return prevRequest !== nextRequest;
      }
      return !areSearchRequestsEqual(prevRequest, nextRequest);
    },
    perform: async (request) => {
      if (request === null) {
        return null;
      }
      return this.performSearch(request);
    },
    onStart: () => {
      this.isSearching.next(true);
    },
    onOutput: (request, response, isDebounceComplete) => {
      // Ignore the results that come before the final result that matches the latest request
      if (isDebounceComplete) {
        if (request !== null && response !== null) {
          this.handleSearchResponse(request, response);
        }
      }
    },
  });

  protected watchEmptySearchSources(request: SearchRequest) {
    this.sourceSubscriptions.push(
      combineLatest([
        this.topUsers.topUsers,
        this.recentPeers,
      ]).subscribe(([topUsersInfo, recentPeers]) => {
        const topUsers = typeof topUsersInfo === 'object'
          ? topUsersInfo.items.map((item) => item.peer)
          : [];

        this.result.next({
          type: SearchResultType.ForEmptyQuery,
          request,
          topUsers,
          recentPeers,
        });
      }),
    );
  }

  protected unwatchSources() {
    this.sourceSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.sourceSubscriptions.splice(0);
  }

  protected addRecentPeersFromDialogs(dialogs: DialogsService) {
    dialogs.dialogs
      .pipe(
        map((dialogIds) => dialogIds.reduce<Peer[]>((peers, dialogId) => {
          if (peers.length >= maxRecentPeersFromDialogsCount) {
            return peers;
          }
          const dialog = dialogCache.get(dialogId);
          if (dialog?._ === 'dialog') {
            peers.push(dialog.peer);
          }
          return peers;
        }, [])),
        first((peers) => peers.length > 0),
      )
      .subscribe((peers) => this.addOldRecentPeers(peers));
  }

  protected addOldRecentPeers(peers: Peer[]) {
    const existingPeers = new Set<string>();
    const newRecentPeers = [...this.recentPeers.value];

    this.recentPeers.value.forEach((peer) => {
      existingPeers.add(peerToId(peer));
    });

    peers.forEach((peer) => {
      const peerId = peerToId(peer);
      if (!existingPeers.has(peerId)) {
        newRecentPeers.push(peer);
        existingPeers.add(peerId);
      }
    });

    this.recentPeers.next(newRecentPeers);
  }
}
