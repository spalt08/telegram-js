import { div, text, img } from 'core/html';
import { Peer, Message } from 'cache/types';
import { peerToInitials, peerToColorCode } from 'cache/accessors';
import { getPeerPhotoInputLocation } from 'helpers/photo';
import { mount, unmountChildren } from 'core/dom';
import media from 'client/media';
import { auth } from 'services';
import { savedmessages, avatarDeletedaccount } from 'components/icons';
import { userCache } from 'cache';
import './avatar.scss';

function isMyself(peer: Peer) {
  return peer._ === 'peerUser' && peer.user_id === auth.userID;
}

function isDeletedAccount(peer: Peer) {
  if (peer._ === 'peerUser') {
    const user = userCache.get(peer.user_id);
    return user?._ !== 'user' || user.deleted;
  }
  return false;
}

function pictureAvatar(src: string | null) {
  const holder = div`.avatar__picture`();
  if (src !== null) {
    mount(holder, img({ src }));
  }
  return holder;
}

function picturelessAvatar(peer: Peer, isForDialogList: boolean) {
  if (isMyself(peer) && isForDialogList) {
    return div`.avatar__predefined`(
      savedmessages(),
    );
  }
  if (isDeletedAccount(peer)) {
    return div`.avatar__predefined`(
      avatarDeletedaccount(),
    );
  }
  return div`.avatar__standard${`color-${peerToColorCode(peer)}`}`(
    text(peerToInitials(peer)[0]),
  );
}

export default function profileAvatar(peer: Peer, message?: Message, isForDialogList = false) {
  const container = div`.avatar`();
  const location = getPeerPhotoInputLocation(peer, message);

  if (location) {
    media.get(location, (src) => {
      unmountChildren(container);
      mount(container, pictureAvatar(src));
    });

    // No cache – add placeholder
    if (!container.firstChild) {
      mount(container, pictureAvatar(null));
    }
  } else {
    mount(container, picturelessAvatar(peer, isForDialogList));
  }

  return container;
}
