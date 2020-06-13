import { map } from 'rxjs/operators';
import { div, text } from 'core/html';
import { message, messageSearch } from 'services';
import { isSearchRequestEmpty } from 'services/message_search/message_search_session';
import * as icons from 'components/icons';
import { roundButton, searchInput, VirtualizedList } from 'components/ui';
import { useToBehaviorSubject } from 'core/hooks';
import { mount } from 'core/dom';
import { peerMessageToId } from 'helpers/api';
import { foundMessage } from 'components/sidebar';
import { pluralize } from 'helpers/other';
import './message_search.scss';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

export default function messageSearchSidebar({ onBack }: SidebarComponentProps) {
  if (message.activePeer.value) messageSearch.setPeer(message.activePeer.value);

  const rootEl = div`.messagesSearch`();
  const [resultIdsSubject] = useToBehaviorSubject(
    rootEl,
    messageSearch.result.pipe(map((result) => result.ids.map((id) => peerMessageToId(message.activePeer.value!, id)))),
    true,
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
    className: 'messagesSearch__messages',
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

  mount(rootEl, div`.messagesSearch__header`(
    roundButton({
      className: 'messagesSearch__close',
      onClick: onBack,
    }, icons.close()),
    searchInputEl,
  ));
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
  mount(rootEl, resultList.container);

  return rootEl;
}
