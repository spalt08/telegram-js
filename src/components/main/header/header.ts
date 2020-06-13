import { pinnedMessageCache } from 'cache';
import * as icons from 'components/icons';
import messageQuote from 'components/message/quote';
import { profileAvatar, profileTitle } from 'components/profile';
import { contextMenu, peerFullStatus, ripple, roundButton, typingIndicator } from 'components/ui';
import { listen, mount, unmountChildren } from 'core/dom';
import { getInterface, useObservable } from 'core/hooks';
import { div } from 'core/html';
import { peerToId } from 'helpers/api';
import { main, message } from 'services';
import './header.scss';

type Props = {
  onBackToContacts: () => void,
};

export default function header({ onBackToContacts }: Props) {
  const container = div`.header.hidden`();

  useObservable(container, message.activePeer, true, (peer) => {
    unmountChildren(container);

    if (!peer) {
      container.classList.add('hidden');
      return;
    }

    const backButton = div`.header__back`(
      roundButton({
        onClick: onBackToContacts,
      }, icons.back()),
    );

    mount(container, backButton);

    const profile = div`.header__profile`(
      profileAvatar(peer, undefined, true),
      div`.header__info`(
        div`.header__title`(profileTitle(peer, true)),
        typingIndicator(peer, 'header__typing-indicator', peerFullStatus(peer, { className: 'header__typing-indicator__content' })),
      ),
    );

    listen(profile, 'click', () => main.openSidebar('info', peer));
    mount(container, profile);

    const pinnedMessage = div`.header__pinned`();
    mount(container, pinnedMessage);

    pinnedMessageCache.useWatchItem(container, peerToId(peer), (msg) => {
      unmountChildren(pinnedMessage);
      if (msg) {
        mount(pinnedMessage, ripple({
          contentClass: 'header__pinned_ripple',
          onClick() {
            message.selectPeer(peer, msg.id);
          },
        }, [
          messageQuote(msg, 'Pinned message'),
        ]));
      }
    });

    const headerContextMenu = contextMenu({
      className: 'header__context-menu',
      options: [
        { icon: icons.info, label: 'Info', onClick: () => main.openSidebar('info', peer) },
        { icon: icons.document, label: 'Shared Media', onClick: () => main.openSidebar('sharedMedia', peer) },
        { icon: icons.mute, label: 'Mute', onClick: () => {} },
        { icon: icons.archive, label: 'Archive', onClick: () => {} },
        { icon: icons.del, label: 'Delete and Leave', onClick: () => {} },
      ],
    });

    const actions = div`.header__actions`(
      roundButton({
        className: 'header__search',
        onClick: () => {
          main.openSidebar('messageSearch', peer);
        },
      }, icons.search()),
      roundButton({
        onClick: (event: MouseEvent) => {
          if (headerContextMenu.parentElement) getInterface(headerContextMenu).close();
          else mount(container, headerContextMenu);
          event.stopPropagation();
        },
      }, icons.more()),
    );

    mount(container, actions);

    container.classList.remove('hidden');
  });

  return container;
}
