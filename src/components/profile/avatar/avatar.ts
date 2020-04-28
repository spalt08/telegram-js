import { div, text, img } from 'core/html';
import { Peer, Message } from 'mtproto-js';
import { peerToInitials, peerToColorCode } from 'cache/accessors';
import { getPeerPhotoInputLocation } from 'helpers/photo';
import { mount } from 'core/dom';
import { download, file } from 'client/media';
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

export default function profileAvatar(peer: Peer, message?: Message, isForDialogList = false) {
  const container = div`.avatar`();

  if (isForDialogList && isMyself(peer)) {
    mount(container, div`.avatar__predefined`(
      savedmessages(),
    ));
  } else if (isDeletedAccount(peer)) {
    mount(container, div`.avatar__predefined`(
      avatarDeletedaccount(),
    ));
  } else {
    const location = getPeerPhotoInputLocation(peer, message);
    if (location) {
      mount(container, div`.avatar__picture`(
        img({ src: file(location, {}) }),
      ));
    } else {
      mount(container, div`.avatar__standard${`color-${peerToColorCode(peer)}`}`(
        text(peerToInitials(peer)[0]),
      ));
    }
  }

  return container;
}
