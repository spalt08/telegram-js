import { div } from 'core/html';
import messages from './messages';
import dialogs from './dialogs';
import menu from './menu/menu';
import messagesSearch from './messages_search/messages_search';
import './home.scss';

/**
 * Handler for route /
 */
export default function home() {
  return (
    div`.home`(
      div`.home__sidebar`(
        menu({ className: 'home__menu' }),
        dialogs({ className: 'home__dialogs' }),
      ),
      div`.home__content`(
        messages(),
      ),
      div`.home__temp-right`(
        messagesSearch(),
      ),
    )
  );
}
