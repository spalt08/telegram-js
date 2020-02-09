import { div } from 'core/html';
import messages from './messages';
import dialogs from './dialogs';
import menu from './menu/menu';
import './home.scss';
import rightSidebar from './right_sidebar/right_sidebar';

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
      div`.home__right_sidebar`(
        rightSidebar(),
      ),
    )
  );
}
