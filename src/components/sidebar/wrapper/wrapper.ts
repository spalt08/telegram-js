import { div } from 'core/html';
import './wrapper.scss';

export default function wrapper(...children: Node[]) {
  return (
    div`.sidebarWrapper`(
      div`.sidebarWrapper__content`(
        ...children,
      ),
    )
  );
}
