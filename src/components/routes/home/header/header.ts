import { message } from 'services';
import { useObservable } from 'core/hooks';
import { div } from 'core/html';
import { unmountChildren, mount } from 'core/dom';
import { profileAvatar } from 'components/profile';
import './header.scss';
import roundButton from 'components/ui/round_button/round_button';
import { more } from 'components/icons';
import { onlineStatus } from 'components/ui/online_status/online_status';
import peerTitle from '../dialog/peer_title';

export default function header() {
  const container = div`.header.hidden`();

  useObservable(container, message.activePeer, (peer) => {
    if (!peer) return;

    unmountChildren(container);

    const profile = div`.header__profile`(
      profileAvatar(peer, undefined, true),
      div`.header__info`(
        div`.header__title`(peerTitle(peer)),
        onlineStatus(peer),
      ),
    );

    mount(container, profile);

    const actions = div`.header__actions`(
      roundButton({ }, more()),
    );

    mount(container, actions);

    container.classList.remove('hidden');
  });

  return container;
}
