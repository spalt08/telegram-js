import { div } from 'core/html';
import { mount, unmount } from 'core/dom';
import { message as service } from 'services';
import { useObservable } from 'core/hooks';
import infoPanel from './panels/info_panel';
import './right_sidebar.scss';

export default function rightSidebar() {
  const container = div`.right_sidebar`();

  let info: Node;

  useObservable(container, service.activePeer, (peer) => {
    if (info) unmount(info);
    if (peer) {
      info = infoPanel(peer);
      mount(container, info);
    }
  });

  return container;
}
