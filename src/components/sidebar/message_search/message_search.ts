import * as icons from 'components/icons';
import { foundMessage } from 'components/sidebar';
import { heading, searchInput, VirtualizedList } from 'components/ui';
import { mount } from 'core/dom';
import { useToBehaviorSubject, useMaybeObservable, getInterface } from 'core/hooks';
import { div, text } from 'core/html';
import { peerMessageToId } from 'helpers/api';
import { pluralize } from 'helpers/other';
import { Peer } from 'mtproto-js';
import { map } from 'rxjs/operators';
import { message, messageSearch } from 'services';
import { isSearchRequestEmpty } from 'services/message_search/message_search_session';
import './message_search.scss';
import { MaybeObservable } from 'core/types';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

export default function messageSearchSidebar({ onBack }: SidebarComponentProps, context?: MaybeObservable<{ peer: Peer, query?: string }>) {
  const rootEl = div`.messagesSearch`();

  const [resultIdsSubject] = useToBehaviorSubject(
    rootEl,
    messageSearch.result.pipe(map((result) => result.ids.map((id) => peerMessageToId(message.activePeer.value!, id)))),
    [],
  );
  const resultQueryObservable = messageSearch.result.pipe(map((result) => result.request));

  const searchInputEl = searchInput({
    placeholder: 'Search Messages',
    className: 'messagesSearch__input',
    isLoading: messageSearch.isSearching,
    onChange(value) {
      messageSearch.search(value);
    },
  });

  useMaybeObservable(rootEl, context!, true, (ctx) => {
    messageSearch.setPeer(ctx.peer);
    if (ctx.query) {
      getInterface(searchInputEl).value = ctx.query;
      messageSearch.search(ctx.query);
    }
  });

  // If the element isn't in layout, the focus call will be ignored
  // temp: blocks sidebar transition
  // to do: fix later
  // const stopWatchingVisibility = watchVisibility(searchInputEl, (isVisible) => {
  //   if (isVisible) {
  //     stopWatchingVisibility();
  //     getInterface(searchInputEl).focus();
  //   }
  // });

  const resultList = new VirtualizedList({
    items: resultIdsSubject,
    threshold: 2,
    pivotBottom: false,
    batch: 30,
    renderer(id) {
      return foundMessage(id, resultQueryObservable);
    },
    onReachBottom() {
      messageSearch.loadMore();
    },
  });

  mount(rootEl, heading({
    className: 'messagesSearch__header',
    title: '',
    element: searchInputEl,
    buttons: [{ icon: icons.back, position: 'left', onClick: () => onBack?.() }],
  }));
  mount(rootEl, div`.messagesSearch__summary`(
    text(messageSearch.result.pipe(map((result) => {
      if (isSearchRequestEmpty(result.request)) {
        return '\u00a0'; // Non-breaking space
      }
      if (result.count === 0) {
        return 'Nothing is found';
      }
      return `${result.count} ${pluralize(result.count, 'message', 'messages')} found`;
    }))),
  ));
  mount(rootEl, div`.messagesSearch__messages`(resultList.container));

  return rootEl;
}
