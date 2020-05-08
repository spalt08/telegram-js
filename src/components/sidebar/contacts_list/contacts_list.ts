import { div } from 'core/html';
import { heading } from 'components/ui';
import type { SidebarComponentProps } from '../sidebar';

export default function contacts({ onBack }: SidebarComponentProps) {
  const container = (
    div`.contactsSidebar`(
      heading({ title: 'Contacts', onClick: () => onBack && onBack() }),
    )
  );

  return container;
}
