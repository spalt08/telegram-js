import { div } from 'core/html';
import { mount, unmountChildren } from 'core/dom';
import { message, main, RightSidebarPanel } from 'services';
import { useObservable, useInterface } from 'core/hooks';
import { combineLatest } from 'rxjs';
import { Peer } from 'client/schema';
import infoPanel from './panels/info_panel';
import searchPanel from './panels/search_panel';
import './right_sidebar.scss';

export default function rightSidebar() {
  const container = div`.rightSidebar`();

  const sidebarSubject = combineLatest(main.rightSidebarPanel, message.activePeer);

  let prevPanel: RightSidebarPanel;
  let prevPeer: Peer;

  useObservable(container, sidebarSubject, ([panel, peer]) => {
    if (panel !== RightSidebarPanel.None && peer) {
      switch (panel) {
        case RightSidebarPanel.Info:
          if (prevPanel !== panel || prevPeer !== peer) {
            unmountChildren(container);
            mount(container, infoPanel(peer));
          }
          break;
        case RightSidebarPanel.Search:
          if (prevPanel !== panel || prevPeer !== peer) {
            unmountChildren(container);
            mount(container, searchPanel(peer));
          }
          break;
        default:
      }

      prevPanel = panel;
      prevPeer = peer;
    }
  });

  return useInterface(container, {
    setWidth(width: number) {
      container.style.width = `${width}px`;
    },
  });
}
