import { div } from 'core/html';
import { heading } from 'components/ui';
import * as icons from 'components/icons';
import type { SidebarComponentProps } from '../sidebar';

export default function contacts({ onBack }: SidebarComponentProps) {
  const container = (
    div`.contactsSidebar`(
      heading({
        title: 'Contacts',
        buttons: [{ icon: icons.back, position: 'left', onClick: () => onBack && onBack() }],
      }),
    )
  );

  return container;
}
