import { message, main, RightSidebarPanel } from 'services';
import { useObservable } from 'core/hooks';
import { div } from 'core/html';
import { unmountChildren, mount } from 'core/dom';
import { profileAvatar, profileTitle } from 'components/profile';
import { more, search } from 'components/icons';
import { onlineStatus, roundButton, typingIndicator, quote, ripple } from 'components/ui';
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
        typingIndicator(peer, 'header__typing-indicator', onlineStatus(peer)),
      ),
    );

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

    const actions = div`.header__actions`(
      roundButton({
        onClick: () => {
          main.setRightSidebarPanel(RightSidebarPanel.Search);
        },
      }, search()),
      roundButton({
        onClick: () => {
          main.setRightSidebarPanel(RightSidebarPanel.Info);
        },
      }, more()),
    );

    mount(container, actions);

    container.classList.remove('hidden');
  });

  return container;
}
