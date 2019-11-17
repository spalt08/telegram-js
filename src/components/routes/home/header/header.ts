import { message } from 'services';
import { useObservable } from 'core/hooks';
import { div, text } from 'core/html';
import { unmountChildren, mount } from 'core/dom';
import { profileAvatar, profileTitle } from 'components/profile';
import './header.scss';

export default function header() {
  const container = div`.header.hidden`();

  useObservable(container, message.activePeer, (peer) => {
    if (!peer) return;

    unmountChildren(container);

    const status = div`.header__status.online`(text('online'));
    const profile = div`.header__profile`(
      profileAvatar(peer),
      div`.header__info`(
        div`.header__title`(profileTitle(peer)),
        status,
      ),
    );

    mount(container, profile);

    container.classList.remove('hidden');
  });

  return container;
}
