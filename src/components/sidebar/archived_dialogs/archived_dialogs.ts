import { div } from 'core/html';
import { heading } from 'components/ui';
import * as icons from 'components/icons';
import { folder } from 'services';
import dialogsList from '../dialogs_list/dialogs_list';
import './archived_dialogs.scss';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

export default function archiveScreen({ onBack }: SidebarComponentProps) {
  return (
    div`.archivedDialogs`(
      heading({
        title: 'Archived Chats',
        buttons: [{ icon: icons.back, position: 'left', onClick: () => onBack && onBack() }],
        className: 'archivedDialogs__head',
      }),
      dialogsList(folder.archiveIndex, 'archivedDialogs__list'),
    )
  );
}
