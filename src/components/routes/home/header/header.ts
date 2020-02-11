import { message, main, RightSidebarPanel } from 'services';
import { useObservable } from 'core/hooks';
import { div } from 'core/html';
import { unmountChildren, mount } from 'core/dom';
import { profileAvatar, profileTitle } from 'components/profile';
import roundButton from 'components/ui/round_button/round_button';
import { more, search } from 'components/icons';
import { onlineStatus } from 'components/ui';
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
        onlineStatus(peer),
      ),
    );

    mount(container, profile);

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
