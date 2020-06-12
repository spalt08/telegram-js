import { div, nothing } from 'core/html';
import { getInterface } from 'core/hooks';
import { mount } from 'core/dom';
import { heading, contextMenu, tabsPanel } from 'components/ui';
import * as icons from 'components/icons';
import { message } from 'services';
import infoPanel from '../panels/info';
import mediaPanel from '../panels/media';
import docsPanel from '../panels/documents';
import linksPanel from '../panels/links';
import './info.scss';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

export default function info({ onBack }: SidebarComponentProps) {
  let container: HTMLElement;

  const peer = message.activePeer.value;

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

  container = div`.infoSidebar`(
    heading({
      title: 'Info',
      buttons: [
        { icon: icons.close, position: 'left', onClick: () => onBack && onBack() },
        { icon: icons.more, position: 'right', onClick: toggleContextMenu },
      ],
    }),
    peer ? infoPanel(peer) : nothing,
    peer ? tabsPanel({ className: 'infoSidebar__panels', headerAlign: 'space-between' }, [
      // to do: members panel,
      { key: 'media', title: 'Media', content: () => mediaPanel(peer) },
      { key: 'docs', title: 'Docs', content: () => docsPanel(peer) },
      { key: 'links', title: 'Links', content: () => linksPanel(peer) },
    ]) : nothing,
  );

  // todo prevent scrolling shared media

  return container;
}
