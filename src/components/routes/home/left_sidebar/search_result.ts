import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { div, text } from 'core/html';
import { useObservable } from 'core/hooks';
import { globalSearch } from 'services';
import { SearchResult, SearchResultType } from 'services/global_search';
import { VirtualizedList } from 'components/ui';
import { peerIdToPeer, peerToId } from 'helpers/api';
import { contact, foundMessage } from 'components/sidebar';
import './search_result.scss';

interface Props extends Record<string, any> {
  className?: string;
}

const sectionHeaders: Record<string, string> = {
  contactPeersHeader: 'Contacts and Chats',
  globalPeersHeader: 'Global Search',
  messagesHeader: 'Messages',
  nothingFound: 'Nothing is found',
};

function searchResultToListItems(result: SearchResult) {
  switch (result.type) {
    case SearchResultType.ForFilledQuery: {
      const items: string[] = [];

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

      return items;
    }
    default:
      return [];
  }
}

function listItem(id: string, searchQuery: Observable<string>) {
  if (id.startsWith('message_')) {
    return foundMessage(id.slice(8), searchQuery);
  }
  if (id.startsWith('contactPeer_')) {
    return contact({
      peer: peerIdToPeer(id.slice(12)),
      searchQuery,
      highlightOnline: false,
    });
  }
  if (id.startsWith('globalPeer_')) {
    return contact({
      peer: peerIdToPeer(id.slice(11)),
      searchQuery,
      highlightOnline: false,
      showUsername: true,
    });
  }
  return div`.globalSearchResult__sectionHeader`(
    div(text(sectionHeaders[id] ?? id)),
  );
}

export default function searchResult({ className = '', ...props }: Props = {}) {
  const listItemsSubject = new BehaviorSubject<string[]>([]);
  const resultQueryObservable = globalSearch.result.pipe(map((result) => result.request));

  const resultList = new VirtualizedList({
    className: 'globalSearchResult__list',
    items: listItemsSubject,
    threshold: 2,
    pivotBottom: false,
    batch: 30,
    renderer(id) {
      return listItem(id, resultQueryObservable);
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
