import { BehaviorSubject, combineLatest, Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import { arePeersSame, messageToDialogPeer, peerMessageToId, peerToId } from 'helpers/api';
import SearchDriver from 'helpers/searchDriver';
import client from 'client/client';
import { ContactsFound, Message, MessagesMessages, Peer } from 'mtproto-js';
import { chatCache, messageCache, persistentCache, userCache } from 'cache';
import { peerToInputPeer } from 'cache/accessors';
import TopUsersService from './top_users';

const loadMessagesChunkLength = 20;
const contactsSearchMaxCount = 10;
const maxRecentPeersCount = 20;

export type SearchRequest = string;

interface FilledQueryResponse {
  contactPeers: readonly Peer[];
  globalPeers: readonly Peer[];
  messageIds: readonly string[];
  messageTotalCount: number;
  isMessageListFull: boolean;
}

export const enum SearchResultType {
  ForEmptyQuery,
  ForFilledQuery,
}

export interface EmptyQueryResult {
  type: SearchResultType.ForEmptyQuery;
  request: SearchRequest;
  topUsers: readonly Peer[],
  recentPeers: readonly Peer[],
}

export interface FilledQueryResult extends FilledQueryResponse {
  type: SearchResultType.ForFilledQuery;
  request: SearchRequest;
}

export type SearchResult = EmptyQueryResult | FilledQueryResult;

export function areSearchRequestsEqual(request1: SearchRequest, request2: SearchRequest): boolean {
  return request1.trim() === request2.trim();
}

export function isSearchRequestEmpty(request: SearchRequest): boolean {
  return request.trim().length === 0;
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

async function search(request: SearchRequest): Promise<FilledQueryResponse> {
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
}

async function loadMore(request: SearchRequest, previousResponse: Pick<FilledQueryResponse, 'messageIds'>) {
  const { messageIds } = previousResponse;
  let lastMessage: Exclude<Message, Message.messageEmpty> | null = null;

  for (let i = messageIds.length - 1; i >= 0; --i) {
    const message = messageCache.get(messageIds[i]);
    if (message && message._ !== 'messageEmpty') {
      lastMessage = message;
      break;
    }
  }

  return searchMessages(request, lastMessage);
}

// private members with # don't work in this class for some reason
export default class GlobalSearch {
  readonly isSearching = new BehaviorSubject(false);

  readonly isLoadingMore = new BehaviorSubject(false);

  readonly result = new BehaviorSubject<Readonly<SearchResult>>({
    type: SearchResultType.ForEmptyQuery,
    request: '',
    topUsers: [],
    recentPeers: [],
  });

  readonly recentPeers = new BehaviorSubject<readonly Peer[]>([]);

  private searchDriver: SearchDriver<SearchRequest, Omit<FilledQueryResponse, 'isMessageListFull'>>;

  private sourceSubscriptions: Subscription[] = [];

  constructor(protected topUsers: TopUsersService) {
    this.searchDriver = new SearchDriver<SearchRequest, Omit<FilledQueryResponse, 'isMessageListFull'>>({
      isRequestEmpty: isSearchRequestEmpty,
      areRequestEqual: areSearchRequestsEqual,
      performSearch: async (request, pageAfter?) => {
        if (!pageAfter) {
          const { isMessageListFull: isEnd, ...result } = await search(request);
          return { result, isEnd };
        }

        const response = await loadMore(request, pageAfter);
        return {
          result: {
            ...pageAfter,
            messageIds: [...pageAfter.messageIds, ...response.ids],
            messageTotalCount: response.count || pageAfter.messageTotalCount,
          },
          isEnd: response.isEnd,
        };
      },
    });

    this.searchDriver.result.subscribe(([request, result, isMessageListFull]) => {
      this.unwatchSources();

      if (result) {
        this.result.next({
          type: SearchResultType.ForFilledQuery,
          request,
          ...result,
          isMessageListFull,
        });
      } else {
        this.watchEmptySearchSources(request);
      }
    });

    this.searchDriver.isSearching.subscribe(this.isSearching);
    this.searchDriver.isLoadingMore.subscribe(this.isLoadingMore);

    persistentCache.isRestored
      .pipe(first((isRestored) => isRestored))
      .subscribe(() => {
        this.addOldRecentPeers(persistentCache.searchRecentPeers || []);
        this.recentPeers.subscribe((peers) => persistentCache.searchRecentPeers = peers);
      });
  }

  search(request: SearchRequest) {
    this.searchDriver.search(request);
  }

  loadMore() {
    this.searchDriver.loadMore();
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

  private watchEmptySearchSources(request: SearchRequest) {
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

  private unwatchSources() {
    this.sourceSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.sourceSubscriptions.splice(0);
  }

  private addOldRecentPeers(peers: readonly Peer[]) {
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
