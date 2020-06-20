import * as icons from 'components/icons';
import { foundMessage } from 'components/sidebar';
import { heading, searchInput, VirtualizedList } from 'components/ui';
import { mount, unmount } from 'core/dom';
import { useToBehaviorSubject, useMaybeObservable, getInterface } from 'core/hooks';
import { div, text } from 'core/html';
import { arePeersSame, peerMessageToId } from 'helpers/api';
import { pluralize } from 'helpers/other';
import { Peer } from 'mtproto-js';
import { map } from 'rxjs/operators';
import { messageSearch } from 'services';
import { isSearchRequestEmpty } from 'services/message_search/message_search_session';
import './message_search.scss';
import { MaybeObservable } from 'core/types';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

interface SearchContext {
  peer: Peer;
  query?: string;
  autoFocus?: boolean;
  disableInput?: boolean;
}

export default function messageSearchSidebar({ onBack }: SidebarComponentProps, context: MaybeObservable<SearchContext | undefined>) {
  const rootEl = div`.messagesSearch`();

  const [resultIdsSubject] = useToBehaviorSubject(
    rootEl,
    messageSearch.result.pipe(map((result) => result.ids.map((id) => peerMessageToId(result.peer, id)))),
    [],
  );
  const resultQueryObservable = messageSearch.result.pipe(map((result) => result.request));

  let header: HTMLElement | undefined;
  let isInputDisabled: boolean | undefined;

  const searchInputEl = searchInput({
    placeholder: 'Search Messages',
    className: 'messagesSearch__input',
    isLoading: messageSearch.isSearching,
    onChange(value) {
      messageSearch.search(value);
    },
  });

  // Conform the context
  useMaybeObservable(rootEl, context, true, (ctx) => {
    if (!ctx) {
      messageSearch.setPeer(undefined);
      return;
    }

    const oldPeer = messageSearch.getPeer();
    messageSearch.setPeer(ctx.peer);

    if (ctx.query !== undefined || !arePeersSame(ctx.peer, oldPeer)) {
      const query = ctx.query || '';
      getInterface(searchInputEl).value = query;
      messageSearch.search(query);
    }

    if (ctx.autoFocus) {
      setTimeout(() => {
        getInterface(searchInputEl).focus();
      }, 300);
    }

    if (!!ctx.disableInput !== isInputDisabled) {
      isInputDisabled = ctx.disableInput;

      if (header) unmount(header);
      header = heading({
        className: 'messagesSearch__header',
        title: isInputDisabled ? 'Search Results' : '',
        element: isInputDisabled ? undefined : searchInputEl,
        buttons: [{ icon: icons.back, position: 'left', onClick: () => onBack?.() }],
      });
      mount(rootEl, header, rootEl.firstChild);
    }
  });

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
