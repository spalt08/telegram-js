import { div } from 'core/html';
import { mount, unmount } from 'core/dom';
import { message as service } from 'services';
import { useObservable } from 'core/hooks';
import infoPanel from './panels/info_panel';
import './right_sidebar.scss';
import mediaPanel from './panels/media_panel';

export default function rightSidebar() {
  const container = div`.right_sidebar`();

  let info: Node;
  let media: Node;

  useObservable(container, service.activePeer, (peer) => {
    if (info) unmount(info);
    if (media) unmount(media);
    if (peer) {
      info = infoPanel(peer);
      media = mediaPanel(peer);
      mount(container, info);
      mount(container, media);
    }
  });

  return container;
}
