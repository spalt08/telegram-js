import { Peer, Message } from 'cache/types';
import { div } from 'core/html';
import { media } from 'services';
import { messageCache } from 'cache';
import { useObservable } from 'core/hooks';
import { unmountChildren, mount } from 'core/dom';
import mediaPhoto from 'components/message/media/photo';
import './media_panel.scss';

export default function mediaPanel(peer: Peer) {
  const container = div`.mediaPanel`();

  media.loadMedia(peer);

  let prevMessages: Message[];

  useObservable(container, messageCache.indices.sharedMedia.getPeerMedia(peer), (messages) => {
    if (prevMessages !== messages) {
      prevMessages = messages;
      unmountChildren(container);
      messages.forEach((message) => {
        if (message?._ === 'message' && message.media._ === 'messageMediaPhoto') {
          mount(container, mediaPhoto(message.media.photo, message, false, false));
        }
      });
    }
  });

  return container;
}
