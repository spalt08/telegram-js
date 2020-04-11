import { map } from 'rxjs/operators';
import { div, text } from 'core/html';
import { main as mainService, messageSearch, RightSidebarPanel } from 'services';
import { isSearchRequestEmpty } from 'services/message_search/message_search_session';
import roundButton from 'components/ui/round_button/round_button';
import { Peer } from 'mtproto-js';
import * as icons from 'components/icons';
import { searchInput, VirtualizedList } from 'components/ui';
import { getInterface, useToBehaviorSubject } from 'core/hooks';
import { mount, watchVisibility } from 'core/dom';
import { peerMessageToId } from 'helpers/api';
import { foundMessage } from 'components/sidebar';
import './search_panel.scss';

export default function searchPanel(peer: Peer) {
  messageSearch.setPeer(peer);

  const rootEl = div`.messagesSearch`();
  const [resultIdsSubject] = useToBehaviorSubject(
    rootEl,
    messageSearch.result.pipe(map((result) => result.ids.map((id) => peerMessageToId(peer, id)))),
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
  const stopWatchingVisibility = watchVisibility(searchInputEl, (isVisible) => {
    if (isVisible) {
      stopWatchingVisibility();
      getInterface(searchInputEl).focus();
    }
  });

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
      onClick: () => mainService.setRightSidebarPanel(RightSidebarPanel.None),
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
      return `${result.count} message${result.count === 1 ? '' : 's'} found`;
    }))),
  ));
  mount(rootEl, resultList.container);

  return rootEl;
}
