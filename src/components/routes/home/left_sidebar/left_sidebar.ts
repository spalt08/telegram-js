import { div } from 'core/html';
import { roundButton, searchInput } from 'components/ui';
import * as icons from 'components/icons';
import dialogs from './dialogs';
import './left_sidebar.scss';

interface Props {
  className?: string;
}

export default function leftSidebar({ className = '' }: Props = {}) {
  return (
    div`.leftSidebar ${className}`(
      div`.leftSidebar__menu`(
        roundButton({ className: 'leftSidebar__menu_icon' }, icons.menuAndBack({ state: 'menu' })),
        searchInput({ placeholder: 'Search', className: 'leftSidebar__menu_search' }),
      ),
      dialogs({ className: 'leftSidebar__dialogs' }),
    )
  );
}
