import * as icons from 'components/icons';
import { contextMenu, heading, tabsPanel } from 'components/ui';
import { mount, listen } from 'core/dom';
import { getInterface } from 'core/hooks';
import { div } from 'core/html';
import { MaybeObservable } from 'core/types';
import { Peer } from 'mtproto-js';
import { main } from 'services';
import docsPanel from '../panels/documents';
import infoPanel from '../panels/info';
import linksPanel from '../panels/links';
import mediaPanel from '../panels/media';
import './info.scss';
import audioPanel from '../panels/audio';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

export default function info({ onBack }: SidebarComponentProps, peer: MaybeObservable<Peer>) {
  let container: HTMLElement;

  const moreContextMenu = contextMenu({
    className: 'infoSidebar__context-menu',
    options: [
      { icon: icons.mute, label: 'Mute', onClick: () => { } },
      { icon: icons.del, label: 'Delete and Leave', onClick: () => { } },
    ],
  });

  const toggleContextMenu = (event: MouseEvent) => {
    if (moreContextMenu.parentElement) getInterface(moreContextMenu).close();
    else mount(container, moreContextMenu);

    event.stopPropagation();
  };

  let tabsEl: HTMLElement;

  container = div`.infoSidebar`(
    heading({
      title: 'Info',
      buttons: [
        { icon: icons.back, position: 'left', onClick: () => onBack && onBack() },
        { icon: icons.more, position: 'right', onClick: toggleContextMenu },
      ],
    }),
    infoPanel(peer),
    tabsEl = tabsPanel({ className: 'infoSidebar__panels', headerAlign: 'space-between' }, [
      // to do: members panel,
      { key: 'media', title: 'Media', content: () => mediaPanel(peer) },
      { key: 'docs', title: 'Docs', content: () => docsPanel(peer) },
      { key: 'links', title: 'Links', content: () => linksPanel(peer) },
      { key: 'audio', title: 'Audio', content: () => audioPanel(peer, 'music') },
      { key: 'voice', title: 'Voice Messages', content: () => audioPanel(peer, 'voice') },
    ]),
  );

  // todo prevent scrolling shared media
  listen(container, 'scroll', () => {
    if (container.scrollHeight - container.scrollTop <= main.window.height) {
      tabsEl.classList.add('-unlocked');

      const list = tabsEl.querySelector('.list');
      if (list instanceof HTMLElement) {
        list.focus();
        list.dispatchEvent(new Event('updateViewport'));
      }
    } else {
      tabsEl.classList.remove('-unlocked');
    }
  });

  return container;
}
