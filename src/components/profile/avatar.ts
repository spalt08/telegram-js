import { div, text, img } from 'core/html';
import { Peer, Message } from 'cache/types';
import { peerToInitials, peerToColorCode } from 'cache/accessors';
import { getPeerPhotoInputLocation } from 'helpers/photo';
import { unmount, mount } from 'core/dom';
import media from 'client/media';
import './avatar.scss';
import { auth } from 'services';
import { savedmessages, avatarDeletedaccount } from 'components/icons';
import { userCache } from 'cache';

function isMe(peer: Peer) {
  return peer._ === 'peerUser' && peer.user_id === auth.userID;
}

function isDeletedAccount(peer: Peer) {
  return (peer._ === 'peerUser' && (userCache.get(peer.user_id)?.deleted ?? true));
}

export default function profileAvatar(peer: Peer, message?: Message) {
  const me = isMe(peer);
  const deletedAccount = isDeletedAccount(peer);
  const container = div`.avatar`();
  const location = getPeerPhotoInputLocation(peer, message);
  let defaultPicture: Element | undefined;

  const preview = (src: string | null) => {
    if (!src) {
      if (me) {
        defaultPicture = div`.avatar__predefined`(
          savedmessages(),
        );
      } else if (deletedAccount) {
        defaultPicture = div`.avatar__predefined`(
          avatarDeletedaccount(),
        );
      } else {
        defaultPicture = div`.avatar__standard${`color-${peerToColorCode(peer)}`}`(
          text(peerToInitials(peer)),
        );
      }

      mount(container, defaultPicture);
    } else {
      if (defaultPicture) unmount(defaultPicture);
      mount(container, div`.avatar__picture`(img({ src })));
    }
  };

  // display default icon
  if (!location || me || deletedAccount) {
    preview(null);
    return container;
  }

  const url = media.cached(location);

  // download file
  if (url === undefined) {
    preview(null);
    media.get(location, preview);

  // display from cache
  } else {
    preview(url);
  }

  return container;
}
