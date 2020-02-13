import { Peer, Message } from 'cache/types';
import { div } from 'core/html';
import { media } from 'services';
import { messageCache } from 'cache';
import { useObservable } from 'core/hooks';
import { unmountChildren, mount, listen } from 'core/dom';
import photoPreview from 'components/media/photo/preview';
import './media_panel.scss';

export default function mediaPanel(peer: Peer) {
  const container = div`.mediaPanel`();

  const grid = div`.mediaPanel__grid`();
  mount(container, grid);

  listen(container, 'scroll', () => {
    if (container.scrollTop + container.offsetHeight > container.scrollHeight - 300) {
      media.loadMedia(peer, messageCache.indices.sharedMedia.getEarliestPeerMedia(peer)?.id);
    }
  }, { passive: true, capture: true });

  media.loadMedia(peer);

  let prevMessages: Message[];

  useObservable(grid, messageCache.indices.sharedMedia.getPeerMedia(peer), (messages) => {
    if (prevMessages !== messages) {
      prevMessages = messages;
      unmountChildren(grid);
      messages.forEach((message) => {
        if (message?._ === 'message' && message.media._ === 'messageMediaPhoto') {
          const el = photoPreview(message.media.photo, peer, message, { fit: 'cover', showLoader: false, width: 100, height: 100 });
          if (el) mount(grid, el);
        }
      });
    }
  });

  return container;
}
