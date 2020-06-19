
import { pinnedMessageCache } from 'cache';
import audioPlayer from 'components/audio_player/audio_player';
import * as icons from 'components/icons';
import messageQuote from 'components/message/quote';
import { profileAvatar, profileTitle } from 'components/profile';
import { contextMenu, formattedMessage, heading, peerFullStatus, ripple, roundButton, searchInput, typingIndicator } from 'components/ui';
import { listen, mount, unmount, unmountChildren } from 'core/dom';
import { getInterface, useMaybeObservable, useObservable } from 'core/hooks';
import { div, nothing } from 'core/html';
import { arePeersSame, peerToId } from 'helpers/api';
import { Peer } from 'mtproto-js';
import { main, message } from 'services';
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

function updateStickyOffset(isPinned: boolean, isAudio: boolean, animate = true) {
  if (isMobile && isPinned && isAudio) setStickyOffset(108, animate);
  else if (isMobile && isPinned && !isAudio) setStickyOffset(54, animate);
  else if (isAudio) setStickyOffset(54, animate);
  else setStickyOffset(0);
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

function pinnedMessage(peer: Peer, isAudioActive: boolean) {
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
      updateStickyOffset(true, isAudioActive);
    } else {
      container.classList.remove('-visible');
      updateStickyOffset(false, isAudioActive);
    }
  });

  if (quote) {
    updateStickyOffset(true, isAudioActive, false);
    container.classList.add('-visible');
  } else updateStickyOffset(false, isAudioActive, false);

  return container;
}

export default function header({ onBackToContacts }: Props) {
  let container: HTMLElement;
  let isAudioActive = false;

  let peer = message.activePeer.value;
  let profile = peer ? headerProfile(peer) : undefined;
  let pinned = peer ? pinnedMessage(peer, isAudioActive) : undefined;

  const backButton = div`.header__back`(
    roundButton({
      onClick: onBackToContacts,
    }, icons.back()),
  );

  const inlineSearchEl = searchInput({
    placeholder: 'Search Messages',
  });

  const inlineSearch = heading({
    title: '',
    className: 'header__inline-search',
    element: inlineSearchEl,
    buttons: [
      {
        icon: icons.back,
        position: 'left',
        onClick: () => {
          container.classList.remove('-searching');
          unmount(inlineSearch);
          updateStickyOffset(pinned ? pinned.classList.contains('-visible') : false, isAudioActive);
        },
      },
    ],
  });

  const player = audioPlayer((state) => {
    updateStickyOffset(pinned ? pinned.classList.contains('-visible') : false, isAudioActive = state);
  });

  const headerContextMenu = contextMenu({
    className: 'header__context-menu',
    options: [
      { icon: icons.info, label: 'Info', onClick: () => peer && main.openSidebar('info', peer) },
      { icon: icons.document, label: 'Shared Media', onClick: () => peer && main.openSidebar('sharedMedia', peer) },
      {
        icon: icons.search,
        label: 'Search Messages',
        onClick: () => {
          if (isMobile) {
            container.classList.add('-searching');
            mount(container, inlineSearch);
            setStickyOffset(0);
          } else if (peer) {
            main.openSidebar('messageSearch', { peer });
          }
        },
      },
      { icon: icons.mute, label: 'Mute', onClick: () => { } },
      { icon: icons.archive, label: 'Archive', onClick: () => { } },
      { icon: icons.del, label: 'Delete and Leave', onClick: () => { } },
    ],
  });

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

  const solutionText = div();
  const solution = div`.header__solution`(
    icons.info2(),
    solutionText,
  );
  let solutionTimeout: any;
  useMaybeObservable(solution, main.quizResultsDelegate, false, (quizResult) => {
    solution.classList.toggle('-visible', !!quizResult);
    unmountChildren(solutionText);
    if (quizResult) {
      mount(solutionText, formattedMessage(quizResult));
      clearTimeout(solutionTimeout);
      solutionTimeout = setTimeout(() => {
        solution.classList.remove('-visible');
      }, 10000);
    }
  });

  container = div`.header`(
    backButton,
    pinned || nothing,
    player,
    solution,
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
    mount(container, pinned = pinnedMessage(peer, isAudioActive), player);
  });

  return container;
}
