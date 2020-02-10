import { div } from 'core/html';
import { searchInput } from 'components/ui';
import './messages_search.scss';

export default function messagesSearch() {
  return div`.messagesSearch`(
    div`.messagesSearch__header`(
      // todo: Add the close button. It must also clear the input.
      searchInput({
        placeholder: 'Search Messages',
        className: 'messagesSearch__input',
      }),
    ),
  );
}
