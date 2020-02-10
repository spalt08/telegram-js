import { div } from 'core/html';
import { searchInput } from 'components/ui';
import { messageSearch } from 'services';
import './messages_search.scss';

export default function messagesSearch() {
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
  );
}
