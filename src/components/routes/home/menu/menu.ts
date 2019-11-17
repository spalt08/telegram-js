import { div, text } from 'core/html';
import * as icons from 'components/icons';
import './menu.scss';

export default function menu() {
  return (
    div`.menu`(
      div`.menu__burger`(icons.menu({ className: 'menu__burger_icon' })),
      div`.menu__search`(
        icons.search({ className: 'menu__search_icon' }),
        text('Search'),
      ),
    )
  );
}
