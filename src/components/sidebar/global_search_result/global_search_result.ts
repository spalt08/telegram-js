import { Peer } from 'mtproto-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';
import { div, text } from 'core/html';
import { useObservable } from 'core/hooks';
import { globalSearch } from 'services';
import { EmptyQueryResult, SearchResult, SearchResultType } from 'services/global_search';
import { VirtualizedList } from 'components/ui';
import { peerIdToPeer, peerToId } from 'helpers/api';
import { contact, contactsRow, foundMessage } from 'components/sidebar';
import './global_search_result.scss';

interface Props extends Record<string, any> {
  className?: string;
  exit(): void;
}

const sectionHeaders: Record<string, string> = {
  contactPeersHeader: 'Contacts and Chats',
  globalPeersHeader: 'Global Search',
  messagesHeader: 'Messages',
  topUsersHeader: 'People',
  recentPeersHeader: 'Recent',
  nothingFound: 'Nothing is found',
};

const addRecentPeerDelay = 300; // To prevent an unnecessary DOM modification during a peer selection animation

function searchResultToListItems(result: SearchResult) {
  const items: string[] = [];

  switch (result.type) {
    case SearchResultType.ForEmptyQuery:
      if (result.topUsers.length) {
        items.push('topUsersHeader', 'topUsers');
      }

      if (result.recentPeers.length) {
        items.push('recentPeersHeader');
        result.recentPeers.forEach((peer) => items.push(`recentPeer_${peerToId(peer)}`));
      }
      break;

    case SearchResultType.ForFilledQuery:
      if (result.contactPeers.length) {
        items.push('contactPeersHeader');
        result.contactPeers.forEach((peer) => items.push(`contactPeer_${peerToId(peer)}`));
      }

      if (result.globalPeers.length) {
        items.push('globalPeersHeader');
        result.globalPeers.forEach((peer) => items.push(`globalPeer_${peerToId(peer)}`));
      }

      if (result.messageTotalCount) {
        items.push('messagesHeader');
        result.messageIds.forEach((id) => items.push(`message_${id}`));
      }

      if (!items.length) {
        items.push('nothingFound');
      }
      break;

    default:
  }

  return items;
}

function addRecentPeer(peer: Peer) {
  setTimeout(() => globalSearch.addRecentPeer(peer), addRecentPeerDelay);
}

function listItem(id: string, searchResult: Observable<SearchResult>, exit: () => void) {
  if (id === 'topUsers') {
    return contactsRow({
      peers: searchResult.pipe(
        filter((result): result is EmptyQueryResult => result.type === SearchResultType.ForEmptyQuery && result.topUsers.length > 0),
        map((result) => result.topUsers),
        distinctUntilChanged(),
      ),
      clickMiddleware(peer, next) {
        next();
        exit();
      },
      className: 'globalSearchResult__topUsers',
    });
  }
  if (id.startsWith('message_')) {
    return foundMessage(id.slice(8), globalSearch.result.pipe(map((result) => result.request)));
  }
  if (id.startsWith('contactPeer_')) {
    const peer = peerIdToPeer(id.slice(12));
    return contact({
      peer,
      searchQuery: globalSearch.result.pipe(map((result) => result.request)),
      highlightOnline: false,
      clickMiddleware(next) {
        next();
        exit();
        addRecentPeer(peer);
      },
    });
  }
  if (id.startsWith('globalPeer_')) {
    const peer = peerIdToPeer(id.slice(11));
    return contact({
      peer,
      searchQuery: globalSearch.result.pipe(map((result) => result.request)),
      highlightOnline: false,
      showUsername: true,
      clickMiddleware(next) {
        next();
        exit();
        addRecentPeer(peer);
      },
    });
  }
  if (id.startsWith('recentPeer_')) {
    const peer = peerIdToPeer(id.slice(11));
    return contact({
      peer,
      highlightOnline: true,
      clickMiddleware(next) {
        next();
        exit();
        addRecentPeer(peer);
      },
    });
  }
  return div`.globalSearchResult__sectionHeader`(text(sectionHeaders[id] ?? id));
}

export default function globalSearchResult({ className = '', exit, ...props }: Props) {
  const listItemsSubject = new BehaviorSubject<string[]>([]);

  const resultList = new VirtualizedList({
    className: 'globalSearchResult__list',
    items: listItemsSubject,
    threshold: 2,
    pivotBottom: false,
    batch: 30,
    renderer(id) {
      return listItem(id, globalSearch.result, exit);
    },
    onReachBottom() {
      globalSearch.loadMore();
    },
  });

  useObservable(
    resultList.container,
    globalSearch.result.pipe(
      map((result) => result.type),
    ),
    true,
    () => resultList.clear(),
  );

  useObservable(resultList.container, globalSearch.result, true, (result) => {
    listItemsSubject.next(searchResultToListItems(result));
  });

  return (
    div`.globalSearchResult ${className}`(
      props,
      resultList.container,
    )
  );
}
