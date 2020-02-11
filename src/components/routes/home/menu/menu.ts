import { div } from 'core/html';
import * as icons from 'components/icons';
import { searchInput } from 'components/ui';
import './menu.scss';
import roundButton from '../../../ui/round_button/round_button';

interface Props {
  className?: string;
}

export default function menu({ className = '' }: Props = {}) {
  return (
    div`.menu ${className}`(
      roundButton({ className: 'menu__burger' }, icons.menu()),
      searchInput({ placeholder: 'Search', className: 'menu__search' }),
    )
  );
}
