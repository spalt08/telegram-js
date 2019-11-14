import { div, text } from 'core/html';
import { menu as icon } from 'components/icons';
import './menu.scss';

export default function menu() {
  return (
    div`.menu`(
      div`.menu__burger`(icon({ className: 'icon' })),
      div`.menu__search`(
        text('Search'),
      ),
    )
  );
}
