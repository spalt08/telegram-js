import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { div, text } from 'core/html';
import { useObservable } from 'core/hooks';
import { globalSearch } from 'services';
import { SearchResult, SearchResultType } from 'services/global_search';
import { VirtualizedList } from 'components/ui';
import { peerToId } from 'helpers/api';
import { foundMessage } from 'components/sidebar';
import './search_result.scss';

interface Props extends Record<string, any> {
  className?: string;
}

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
  return div(text(id));
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
