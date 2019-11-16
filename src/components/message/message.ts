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

const cornerSvg = svgCodeToComponent(corner);
const cornerShadowSvg = svgCodeToComponent(cornerShadow);

interface MessageHooks {
  getFromID(): number;
};

export default function message(id: number, peer: Peer) {
  const container = div`.message.last`();
  const subject = messageCache.useItemBehaviorSubject(container, peerMessageToId(peer, id));
  const msg = subject.value;

  // todo return null
  if (!msg || msg._ === 'messageEmpty') return text('');
  if (msg._ === 'messageService') return serviceMessage(msg);

  const out = msg.from_id === auth.userID ? 'out' : '';

  if (out) container.classList.add('out');
  // Rerender on change
  useObservable(container, subject, (next) => {
    if (!next || next._ === 'messageEmpty') return;
    if (next._ === 'messageService') return;

    let picture = null;
    let title = null;
    let media = null;
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
      wrapper = div`.message__baloon`(media);
    }

    if (!media && next.message.length <= 6 && isEmoji(next.message)) {
      wrapper = div`.message__sticker`(
        div`.message__emoji${`e${next.message.length/2}`}`(text(next.message)),
        div`.message__date`(
          datetime({ timestamp: msg.date }),
        ),
      );
    } else if (next.message) {
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

    if (prev && hasInterface<MessageHooks>(prev) && msg.from_id === getInterface(prev).getFromID()) {
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
