import { div } from 'core/html';
import { heading } from 'components/ui';
import type { SidebarComponentProps } from '../sidebar';
import './settings.scss';

export default function settings({ onBack }: SidebarComponentProps) {
  const container = (
    div`.settingsSidebar`(
      heading({ title: 'Settings', onClick: () => onBack && onBack() }),
    )
  );

  return container;
}
