import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { Peer } from 'mtproto-js';
import client from 'client/client';
import { chatCache, userCache } from 'cache';
import SearchDriver from 'helpers/searchDriver';
import { peerToId } from 'helpers/api';
import DialogsService from '../dialog/dialog';
import FolderService from './folder';

export type SearchRequest = string;

export interface SearchResult {
  fromQuery: boolean;
  peers: readonly string[];
}

const contactsSearchMaxCount = 20;

export function areSearchRequestsEqual(request1: SearchRequest, request2: SearchRequest): boolean {
  return request1.trim() === request2.trim();
}

export function isSearchRequestEmpty(request: SearchRequest): boolean {
  return request.trim().length === 0;
}

async function searchPeers(request: SearchRequest): Promise<Peer[]> {
  const data = await client.call('contacts.search', { q: request, limit: contactsSearchMaxCount });
  userCache.put(data.users);
  chatCache.put(data.chats);
  return [...data.my_results, ...data.results];
}

export default function makeFilterPeerSearchSession(foldersService: FolderService, dialogsService: DialogsService) {
  const result = new BehaviorSubject<readonly string[] | undefined>(undefined);

  const searchDriver = new SearchDriver<SearchRequest, Peer[]>({
    isRequestEmpty: isSearchRequestEmpty,
    areRequestEqual: areSearchRequestsEqual,
    async performSearch(request) {
      try {
        return {
          result: await searchPeers(request),
          isEnd: true,
        };
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('Failed to search for contacts', error);
        }
        return { result: [], isEnd: false };
      }
    },
  });

  searchDriver.result.subscribe(([_request, newResult]) => {
    result.next(newResult && newResult.map(peerToId));
  });

  function search(request: SearchRequest) {
    searchDriver.search(request);
  }

  function loadMore() {
    if (result.value === undefined) {
      dialogsService.loadMoreDialogs();
    }
  }

  const peersObservable = new Observable<SearchResult>((subscriber) => {
    let dialogsSubscription: Subscription | undefined;

    const subscription = result.subscribe((newResult) => {
      if (newResult) {
        if (dialogsSubscription) {
          dialogsSubscription.unsubscribe();
          dialogsSubscription = undefined;
        }
        subscriber.next({ fromQuery: true, peers: newResult });
        return;
      }

      if (!dialogsSubscription) {
        // todo: Optimize. Each time an index is subscribed, it calculates the order from scratch.
        dialogsSubscription = foldersService.rootIndex.order.subscribe(({ ids }) => subscriber.next({ fromQuery: false, peers: ids }));
      }
    });

    return () => subscription.unsubscribe();
  });

  return { search, loadMore, peers: peersObservable };
}
