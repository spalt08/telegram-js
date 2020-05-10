import { message, main } from 'services';
import { useObservable, getInterface } from 'core/hooks';
import { div } from 'core/html';
import { unmountChildren, mount, listen } from 'core/dom';
import { profileAvatar, profileTitle } from 'components/profile';
import * as icons from 'components/icons';
import { peerFullStatus, roundButton, typingIndicator, quote, ripple, contextMenu } from 'components/ui';
import { pinnedMessageCache } from 'cache';
import { peerToId } from 'helpers/api';
import './header.scss';

export default function header() {
  const container = div`.header.hidden`();

  useObservable(container, message.activePeer, (peer) => {
    unmountChildren(container);

    if (!peer) {
      container.classList.add('hidden');
      return;
    }

    const profile = div`.header__profile`(
      profileAvatar(peer, undefined, true),
      div`.header__info`(
        div`.header__title`(profileTitle(peer, true)),
        typingIndicator(peer, 'header__typing-indicator', peerFullStatus(peer, { className: 'header__typing-indicator__content' })),
      ),
    );

    listen(profile, 'click', () => main.openSidebar('info'));
    mount(container, profile);

    const pinnedMessage = div`.header__pinned`();
    mount(container, pinnedMessage);

    pinnedMessageCache.useItemBehaviorSubject(container, peerToId(peer)).subscribe((msg) => {
      unmountChildren(pinnedMessage);
      if (msg?._ === 'message') {
        mount(pinnedMessage, ripple({
          contentClass: 'header__pinned_ripple',
          onClick() {
            message.selectPeer(peer, msg.id);
          },
        }, [
          quote('Pinned message', msg.message),
        ]));
      }
    });

    const headerContextMenu = contextMenu({
      className: 'header__context-menu',
      options: [
        { icon: icons.info, label: 'Info', onClick: () => main.openSidebar('info') },
        { icon: icons.document, label: 'Shared Media', onClick: () => main.openSidebar('sharedMedia') },
        { icon: icons.mute, label: 'Mute', onClick: () => {} },
        { icon: icons.archive, label: 'Archive', onClick: () => {} },
        { icon: icons.del, label: 'Delete and Leave', onClick: () => {} },
      ],
    });

    const actions = div`.header__actions`(
      roundButton({
        onClick: () => {
          main.openSidebar('search');
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
