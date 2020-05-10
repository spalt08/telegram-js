import { div } from 'core/html';
import { heading } from 'components/ui';
import * as icons from 'components/icons';
import type { SidebarComponentProps } from '../sidebar';

export default function settings({ onBack }: SidebarComponentProps) {
  const container = (
    div`.settingsSidebar`(
      heading({
        title: 'Settings',
        buttons: [{ icon: icons.back, position: 'left', onClick: () => onBack && onBack() }],
      }),
    )
  );

  return container;
}
