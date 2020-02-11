import { map } from 'rxjs/operators';
import { div, text } from 'core/html';
import { main as mainService, messageSearch, RightSidebarPanel } from 'services';
import { isSearchRequestEmpty } from 'services/message_search/message_search_session';
import roundButton from 'components/ui/round_button/round_button';
import { Peer } from 'cache/types';
import * as icons from 'components/icons';
import { searchInput } from 'components/ui';
import { getInterface, useOnMount } from 'core/hooks';
import './search_panel.scss';

export default function searchPanel(peer: Peer) {
  messageSearch.setPeer(peer);

  const searchInputEl = searchInput({
    placeholder: 'Search Messages',
    className: 'messagesSearch__input',
    isLoading: messageSearch.isSearching,
    onChange(value) {
      messageSearch.search(value);
    },
  });

  useOnMount(searchInputEl, () => getInterface(searchInputEl).focus());

  return div`.messagesSearch`(
    div`.messagesSearch__header`(
      roundButton({
        className: 'messagesSearch__close',
        onClick: () => mainService.setRightSidebarPanel(RightSidebarPanel.None),
      }, icons.close()),
      searchInputEl,
    ),
    div`.messagesSearch__summary`(
      text(messageSearch.result.pipe(map((result) => {
        if (isSearchRequestEmpty(result.request)) {
          return '\u00a0'; // Non-breaking space
        }
        if (result.count === 0) {
          return 'Nothing is found';
        }
        return `${result.count} message${result.count === 1 ? '' : 's'} found`;
      }))),
    ),
  );
}
