
import { Peer } from 'mtproto-js';
import { pinnedMessageCache } from 'cache';
import * as icons from 'components/icons';
import messageQuote from 'components/message/quote';
import { profileAvatar, profileTitle } from 'components/profile';
import { contextMenu, peerFullStatus, ripple, roundButton, typingIndicator } from 'components/ui';
import { listen, mount, unmount } from 'core/dom';
import { getInterface, useObservable } from 'core/hooks';
import { div, nothing } from 'core/html';
import { peerToId, arePeersSame } from 'helpers/api';
import { main, message } from 'services';
import audioPlayer from 'components/audio_player/audio_player';
import './header.scss';

type Props = {
  onBackToContacts: () => void,
};

const isMobile = main.window.width < 700;

let rule: CSSStyleDeclaration | undefined;
function setStickyOffset(px: number, animate = true) {
  try {
    if (!rule) {
      const styleEl = document.createElement('style');
      document.head.appendChild(styleEl);
      const styleSheet = styleEl.sheet;
      styleSheet!.addRule('.historyDay__label', 'top: 0px');
      rule = (styleSheet!.rules[0] as any).style;
    }
  } finally {
    if (rule) {
      rule.top = `${px}px`;
      if (animate) rule.transition = 'top .2s ease-out';
      else rule.transition = '';
    }
  }
}

function headerProfile(peer: Peer) {
  const container = div`.header__profile`(
    profileAvatar(peer, undefined, true),
    div`.header__info`(
      div`.header__title`(profileTitle(peer, true)),
      typingIndicator(peer, 'header__typing-indicator', peerFullStatus(peer, { className: 'header__typing-indicator__content' })),
    ),
  );

  listen(container, 'click', () => main.openSidebar('info', peer));

  return container;
}

function pinnedMessage(peer: Peer) {
  let msg = pinnedMessageCache.get(peerToId(peer));
  let quote = msg ? messageQuote(msg, 'Pinned message') : undefined;
  let rippleEl: ReturnType<typeof ripple>;

  const container = div`.header__pinned`(
    rippleEl = ripple({
      contentClass: 'header__pinned_ripple',
      onClick: () => msg && message.selectPeer(peer, msg.id),
    }, [
      quote || nothing,
    ]),
  );

  pinnedMessageCache.useWatchItem(container, peerToId(peer), (nextMsg) => {
    if ((nextMsg || {}).id === (msg || {}).id) return;
    msg = nextMsg;

    if (quote) unmount(quote);

    if (msg) {
      getInterface(rippleEl).mountChild(quote = messageQuote(msg, 'Pinned message'));
      container.classList.add('-visible');
      if (isMobile) setStickyOffset(54);
    } else {
      container.classList.remove('-visible');
      if (isMobile) setStickyOffset(0);
    }
  });

  if (quote) {
    if (isMobile) setStickyOffset(54, false);
    container.classList.add('-visible');
  } else if (isMobile) setStickyOffset(0, false);

  return container;
}

export default function header({ onBackToContacts }: Props) {
  const backButton = div`.header__back`(
    roundButton({
      onClick: onBackToContacts,
    }, icons.back()),
  );

  let peer = message.activePeer.value;
  let profile = peer ? headerProfile(peer) : undefined;
  let pinned = peer ? pinnedMessage(peer) : undefined;
  const player = audioPlayer();

  const headerContextMenu = contextMenu({
    className: 'header__context-menu',
    options: [
      { icon: icons.info, label: 'Info', onClick: () => peer && main.openSidebar('info', peer) },
      { icon: icons.document, label: 'Shared Media', onClick: () => peer && main.openSidebar('sharedMedia', peer) },
      { icon: icons.mute, label: 'Mute', onClick: () => {} },
      { icon: icons.archive, label: 'Archive', onClick: () => {} },
      { icon: icons.del, label: 'Delete and Leave', onClick: () => {} },
    ],
  });

  let container: HTMLElement;
  const actions = div`.header__actions`(
    roundButton({
      className: 'header__search',
      onClick: () => peer && main.openSidebar('messageSearch', { peer }),
    }, icons.search()),
    roundButton({
      onClick: (event: MouseEvent) => {
        if (headerContextMenu.parentElement) getInterface(headerContextMenu).close();
        else mount(container, headerContextMenu);
        event.stopPropagation();
      },
    }, icons.more()),
  );

  container = div`.header`(
    backButton,
    pinned || nothing,
    player,
    profile || nothing,
    actions,
  );

  useObservable(container, message.activePeer, true, (nextPeer) => {
    if (!nextPeer || arePeersSame(peer, nextPeer)) return;

    peer = nextPeer;

    // Update Peer Info
    if (profile) unmount(profile);
    mount(container, profile = headerProfile(peer), actions);

    // Update Pinned Message
    if (pinned) unmount(pinned);
    mount(container, pinned = pinnedMessage(peer), player);
  });

  return container;
}
