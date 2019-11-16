import { div, text, nothing } from 'core/html';
import { svgCodeToComponent } from 'core/factory';
import { unmount, mount, unmountChildren } from 'core/dom';
import { useOnMount, useObservable, useInterface, getInterface, hasInterface } from 'core/hooks';
import { Peer } from 'cache/types';
import { messageCache } from 'cache';
import { datetime } from 'components/ui';
import { profileAvatar, profileTitle } from 'components/profile';
import { peerMessageToId, userIdToPeer } from 'helpers/api';
import { isEmoji } from 'helpers/message';
import { auth } from 'services';
import corner from 'assets/message_corner.svg?raw';
import cornerShadow from 'assets/message_corner-shadow.svg?raw';
import serviceMessage from './message_service';
import messageMedia from './message_media';
import './message.scss';
import emojiMessage from './message_emoji';

const cornerSvg = svgCodeToComponent(corner);
const cornerShadowSvg = svgCodeToComponent(cornerShadow);

interface MessageHooks {
  getFromID(): number;
}

export default function message(id: number, peer: Peer) {
  const container = div`.message.last`();
  const subject = messageCache.useItemBehaviorSubject(container, peerMessageToId(peer, id));
  const msg = subject.value;

  // todo return null
  if (!msg || msg._ === 'messageEmpty') return div();
  if (msg._ === 'messageService') return serviceMessage(msg);

  const out = msg.from_id === auth.userID ? 'out' : '';

  if (out) container.classList.add('out');
  // Rerender on change
  useObservable(container, subject, (next) => {
    if (!next || next._ === 'messageEmpty') return;
    if (next._ === 'messageService') return;

    let picture = null;
    let title = null;
    let media: Node | null = null;
    let wrapper = null;

    if (!out && peer._ !== 'peerUser') {
      const fromPeer = userIdToPeer(msg.from_id);
      picture = profileAvatar(fromPeer, next);
      title = div`.message__title`(profileTitle(fromPeer));

      container.classList.add('chat');
    }

    if (msg.media && msg.media._ !== 'messageMediaEmpty') {
      media = messageMedia(msg.media);
    }

    if (!next.message && media) {
      container.classList.add('media');

      if (media instanceof HTMLElement && media.classList.contains('sticker')) {
        wrapper = media;
      } else {
        wrapper = div`.message__baloon`(media);
      }
    }

    if (!media && next.message.length <= 6 && isEmoji(next.message)) {
      wrapper = emojiMessage(next.message, next.date);
    }

    if (!wrapper && next.message) {
      wrapper = div`.message__baloon`(
        media || nothing,
        div`.message__content`(
          div`.message__text`(
            title || nothing,
            text(next.message),
          ),
        ),
        div`.message__date`(
          datetime({ timestamp: msg.date }),
        ),
      );

      if (media) container.classList.add('with-media');
    }

    unmountChildren(container);

    if (picture) mount(container, picture);
    if (wrapper) mount(container, wrapper);
    mount(container, cornerSvg({ className: 'message__corner' }));
    mount(container, cornerShadowSvg({ className: 'message__corner-shadow' }));
  });

  // cleanup prev messages from same sender
  useOnMount(container, () => {
    const prev = container.previousElementSibling;
    const pinterface = prev && hasInterface<MessageHooks>(prev) ? getInterface(prev) : null;

    if (prev && pinterface && pinterface.getFromID && msg.from_id === pinterface.getFromID()) {
      prev.classList.remove('last');

      const svgs = prev!.getElementsByTagName('svg');

      for (let i = svgs.length - 1; i >= 0; i -= 1) unmount(svgs[i]);
    } else if (prev) {
      container.classList.add('first');
    }
  });

  return useInterface(container, {
    getFromID() {
      return msg.from_id;
    },
  });
}
