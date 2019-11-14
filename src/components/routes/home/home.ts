import { div } from 'core/html';
import messages from './messages';
import dialogs from './dialogs';
import menu from './menu/menu';
import './home.scss';

/**
 * Handler for route /
 */
export default function home() {
  return (
    div`.home`(
      div`.home__sidebar`(
        menu(),
        dialogs(),
      ),
      div`.home__content`(
        messages(),
      ),
    )
  );
}
