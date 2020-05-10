import { div } from 'core/html';
import { heading } from 'components/ui';
import * as icons from 'components/icons';
import type { SidebarComponentProps } from '../sidebar';

export default function newGroup({ onBack }: SidebarComponentProps) {
  const container = (
    div`.newGroupSidebar`(
      heading({
        title: 'New Group',
        buttons: [{ icon: icons.back, position: 'left', onClick: () => onBack && onBack() }],
      }),
    )
  );

  return container;
}
