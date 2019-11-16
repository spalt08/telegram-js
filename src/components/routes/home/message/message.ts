import { div, text } from 'core/html';
import { svgCodeToComponent } from 'core/factory';
import { unmount } from 'core/dom';
import { useOnMount } from 'core/hooks';
import { Peer } from 'cache/types';
import { messageCache, userCache } from 'cache';
import { datetime } from 'components/ui';
import { peerMessageToId } from 'helpers/api';
import { auth } from 'services';
import corner from './message-corner.svg?raw';
import cornerShadow from './message-corner-shadow.svg?raw';
import serviceMessage from './message_service';
import messageMedia from './message_media';
import './message.scss';

const cornerSvg = svgCodeToComponent(corner);
const cornerShadowSvg = svgCodeToComponent(cornerShadow);

export default function message(id: number, peer: Peer) {
  const msg = messageCache.get(peerMessageToId(peer, id));

  if (!msg || msg._ === 'messageEmpty') return div();

  if (msg._ === 'messageService') return serviceMessage(msg);

  // todo: null el
  const out = msg.from_id === auth.userID ? 'out' : '';
  let picture: Node = text('');
  let title: Node = text('');
  let withpic = '';
  let media: Node = text('');

  if (!out && peer && peer._ !== 'peerUser') {
    const user = userCache.get(msg.from_id);

    picture = div`.message__picture`(
      div`.message__picture-empty`(),
    );

    withpic = 'withpic';

    if (user) title = div`.message__title`(text(`${user.first_name} ${user.last_name}`));
  }

  if (msg.media) {
    media = messageMedia(msg.media) || media;
  }

  const attrs = peer && msg.from_id ? { 'data-uid': msg.from_id } : {};

  const element = (
    div`.message last${out}${withpic}`(attrs,
      picture,
      div`.message__wrapper`(
        media,
        div`.message__content`(
          div`.message__text`(
            title,
            text(msg.message || ''),
          ),
          div`.message__date`(
            datetime({ timestamp: msg.date }),
          ),
        ),
      ),
      cornerSvg({ className: 'message__corner' }),
      cornerShadowSvg({ className: 'message__corner-shadow' }),
    )
  );

  useOnMount(element, () => {
    const prev = element.previousElementSibling;

    if (prev && prev.getAttribute('data-uid') === element.getAttribute('data-uid')) {
      prev.classList.remove('last');

      const svgs = prev.getElementsByTagName('svg');

      unmount(svgs[1]);
      unmount(svgs[0]);
    }

    if (prev && prev.getAttribute('data-uid') !== element.getAttribute('data-uid')) {
      element.classList.add('first');
    }
  });

  return element;
}