import { map } from 'rxjs/operators';
import { div, text } from 'core/html';
import { searchInput } from 'components/ui';
import { messageSearch } from 'services';
import { isSearchRequestEmpty } from 'services/message_search/message_search_session';
import './messages_search.scss';

export default function messagesSearch() {
  // todo: Reset the whole component state when the selected peer changes
  return div`.messagesSearch`(
    div`.messagesSearch__header`(
      // todo: Add the close button. It must also clear the input.
      // todo: Focus the field on open
      searchInput({
        placeholder: 'Search Messages',
        className: 'messagesSearch__input',
        isLoading: messageSearch.isSearching,
        onChange(value) {
          messageSearch.search(value);
        },
      }),
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
