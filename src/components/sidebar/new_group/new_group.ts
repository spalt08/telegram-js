import { div } from 'core/html';
import { heading } from 'components/ui';
import type { SidebarComponentProps } from '../sidebar';

export default function newGroup({ onBack }: SidebarComponentProps) {
  const container = (
    div`.newGroupSidebar`(
      heading({ title: 'New Group', onClick: () => onBack && onBack() }),
    )
  );

  return container;
}
