import { div, text } from 'core/html';
import * as icons from 'components/icons';
import './menu.scss';

interface Props {
  className?: string;
}

export default function menu({ className = '' }: Props = {}) {
  return (
    div`.menu ${className}`(
      div`.menu__burger`(icons.menu({ className: 'menu__burger_icon' })),
      div`.menu__search`(
        icons.search({ className: 'menu__search_icon' }),
        text('Search'),
      ),
    )
  );
}
