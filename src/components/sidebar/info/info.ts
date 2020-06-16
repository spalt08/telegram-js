import * as icons from 'components/icons';
import { contextMenu, heading, tabsPanel } from 'components/ui';
import { mount } from 'core/dom';
import { getInterface } from 'core/hooks';
import { div } from 'core/html';
import { MaybeObservable } from 'core/types';
import { Peer } from 'mtproto-js';
import docsPanel from '../panels/documents';
import infoPanel from '../panels/info';
import linksPanel from '../panels/links';
import mediaPanel from '../panels/media';
import './info.scss';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

export default function info({ onBack }: SidebarComponentProps, peer: MaybeObservable<Peer>) {
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

  container = div`.infoSidebar`(
    heading({
      title: 'Info',
      buttons: [
        { icon: icons.close, position: 'left', onClick: () => onBack && onBack() },
        { icon: icons.more, position: 'right', onClick: toggleContextMenu },
      ],
    }),
    infoPanel(peer),
    tabsPanel({ className: 'infoSidebar__panels', headerAlign: 'space-between' }, [
      // to do: members panel,
      { key: 'media', title: 'Media', content: () => mediaPanel(peer) },
      { key: 'docs', title: 'Docs', content: () => docsPanel(peer) },
      { key: 'links', title: 'Links', content: () => linksPanel(peer) },
    ]),
  );

  // todo prevent scrolling shared media

  return container;
}
