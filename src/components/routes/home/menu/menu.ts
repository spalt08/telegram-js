import { div } from 'core/html';
import * as icons from 'components/icons';
import { searchInput } from 'components/ui';
import './menu.scss';

interface Props {
  className?: string;
}

export default function menu({ className = '' }: Props = {}) {
  return (
    div`.menu ${className}`(
      div`.menu__burger`(icons.menu({ className: 'menu__burger_icon' })),
      searchInput({ placeholder: 'Search', className: 'menu__search' }),
    )
  );
}
