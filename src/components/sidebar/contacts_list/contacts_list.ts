import { div } from 'core/html';
import { heading } from 'components/ui';
import * as icons from 'components/icons';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

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
