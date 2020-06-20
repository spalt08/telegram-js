import { div, text } from 'core/html';
import * as icons from 'components/icons';
import { ripple } from 'components/ui';
import foldersSticker from 'assets/folders1.tgs';
import './filters_info.scss';
import screenTgs from '../screen_tgs/screen_tgs';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

export default function filtersInfo(onNavigate: SidebarComponentProps['onNavigate']) {
  return (
    div`.filtersInfo`(
      screenTgs({
        src: foldersSticker,
        loop: false,
        width: 82,
        height: 82,
      }),
      div`.filtersInfo__text`(
        text('Create folders for different groups of chats and quickly switch between them.'),
      ),
      ripple({
        tag: 'button',
        className: 'filtersInfo__add',
        contentClass: 'filtersInfo__add_content',
        onClick() {
          // eslint-disable-next-line no-unused-expressions
          onNavigate?.('filterForm', undefined);
        },
      }, [
        icons.add({ class: 'filtersInfo__add_icon' }),
        text('Create Folder'),
      ]),
    )
  );
}
