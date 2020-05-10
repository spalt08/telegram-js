import { div } from 'core/html';
import { getInterface } from 'core/hooks';
import { mount } from 'core/dom';
import { heading, contextMenu } from 'components/ui';
import * as icons from 'components/icons';
import infoPanel from './panels/info_panel';
import './info.scss';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

export default function info({ onBack }: SidebarComponentProps) {
  let container: HTMLElement;

  const moreContextMenu = contextMenu({
    className: 'infoSidebar__context-menu',
    options: [
      { icon: icons.mute, label: 'Mute', onClick: () => {} },
      { icon: icons.del, label: 'Delete and Leave', onClick: () => {} },
    ],
  });

  const toggleContextMenu = (event: MouseEvent) => {
    if (moreContextMenu.parentElement) getInterface(moreContextMenu).close();
    else mount(container, moreContextMenu);

    event.stopPropagation();
  };

  return container = div`.infoSidebar`(
    heading({
      title: 'Info',
      buttons: [
        { icon: icons.close, position: 'left', onClick: () => onBack && onBack() },
        { icon: icons.more, position: 'right', onClick: toggleContextMenu },
      ],
    }),
    infoPanel(),
  );
}
