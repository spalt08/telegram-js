import { div, img } from 'core/html';
import { Peer, Message } from 'mtproto-js';
import { peerToInitials, peerToColorCode } from 'cache/accessors';
import { getPeerPhotoInputLocation } from 'helpers/photo';
import { mount, listen } from 'core/dom';
import { useObservable } from 'core/hooks';
import { file } from 'client/media';
import { savedmessages, avatarDeletedaccount } from 'components/icons';
import { userCache } from 'cache';
import { isSelf } from 'helpers/api';
import './avatar.scss';

function isDeletedAccount(peer: Peer) {
  if (peer._ === 'peerUser') {
    const user = userCache.get(peer.user_id);
    return user?._ !== 'user' || user.deleted;
  }
  return false;
}

export default function profileAvatar(peer: Peer, message?: Message, isForDialogList = false) {
  const container = div`.avatar`();

  if (isForDialogList && isSelf(peer)) {
    container.classList.add('-predefined');
    mount(container, savedmessages());
  } else if (isDeletedAccount(peer)) {
    container.classList.add('-predefined');
    mount(container, avatarDeletedaccount());
  } else {
    const location = getPeerPhotoInputLocation(peer, message);
    if (location) {
      const src = file(location, {});
      const el = img`.avatar.-picture`({ src });
      listen(el, 'error', () => {
        el.src = '';
        setTimeout(() => el.src = src, 1000);
      });

      return el;
    }

    container.classList.add('-standard');
    container.classList.add(`-color-${peerToColorCode(peer)}`);
    useObservable(container, peerToInitials(peer)[1], true, (initials) => container.textContent !== initials && (container.textContent = initials));
  }

  return container;
}
