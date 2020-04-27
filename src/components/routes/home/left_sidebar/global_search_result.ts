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
  onExit?(): void;
}

const sectionHeaders: Record<string, string> = {
  contactPeersHeader: 'Contacts and Chats',
  globalPeersHeader: 'Global Search',
  messagesHeader: 'Messages',
  topUsersHeader: 'People',
  recentPeersHeader: 'Recent',
  nothingFound: 'Nothing is found',
};

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

function makeCallOnClick(callback?: () => void) {
  return (next: () => void) => {
    next();
    if (callback) {
      callback();
    }
  };
}

function listItem(id: string, searchQuery: Observable<string>, searchResult: Observable<SearchResult>, onExit?: () => void) {
  if (id === 'topUsers') {
    return contactsRow({
      peers: searchResult.pipe(
        filter((result): result is EmptyQueryResult => result.type === SearchResultType.ForEmptyQuery && result.topUsers.length > 0),
        map((result) => result.topUsers),
        distinctUntilChanged(),
      ),
      clickMiddleware: makeCallOnClick(onExit),
    });
  }
  if (id.startsWith('message_')) {
    return foundMessage(id.slice(8), searchQuery);
  }
  if (id.startsWith('contactPeer_')) {
    return contact({
      peer: peerIdToPeer(id.slice(12)),
      searchQuery,
      highlightOnline: false,
      clickMiddleware: makeCallOnClick(onExit),
    });
  }
  if (id.startsWith('globalPeer_')) {
    return contact({
      peer: peerIdToPeer(id.slice(11)),
      searchQuery,
      highlightOnline: false,
      showUsername: true,
      clickMiddleware: makeCallOnClick(onExit),
    });
  }
  if (id.startsWith('recentPeer_')) {
    return contact({
      peer: peerIdToPeer(id.slice(11)),
      highlightOnline: true,
      clickMiddleware: makeCallOnClick(onExit),
    });
  }
  return div`.globalSearchResult__sectionHeader`(
    div(text(sectionHeaders[id] ?? id)),
  );
}

export default function globalSearchResult({ className = '', onExit, ...props }: Props = {}) {
  const listItemsSubject = new BehaviorSubject<string[]>([]);
  const resultQueryObservable = globalSearch.result.pipe(map((result) => result.request));

  const resultList = new VirtualizedList({
    className: 'globalSearchResult__list',
    items: listItemsSubject,
    threshold: 2,
    pivotBottom: false,
    batch: 30,
    renderer(id) {
      return listItem(id, resultQueryObservable, globalSearch.result, onExit);
    },
    onReachBottom() {
      globalSearch.loadMore();
    },
  });

  useObservable(
    resultList.container,
    globalSearch.result.pipe(
      map((result) => result.type),
      distinctUntilChanged(),
    ),
    () => resultList.clear(),
  );

  useObservable(resultList.container, globalSearch.result, (result) => {
    listItemsSubject.next(searchResultToListItems(result));
  });

  return (
    div`.globalSearchResult ${className}`(
      props,
      resultList.container,
    )
  );
}
