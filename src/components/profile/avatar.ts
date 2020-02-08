import { div, text, img } from 'core/html';
import { Peer, Message } from 'cache/types';
import { peerToInitials, peerToColorCode } from 'cache/accessors';
import { getPeerPhotoInputLocation } from 'helpers/photo';
import { unmount, mount } from 'core/dom';
import media from 'client/media';
import './avatar.scss';

export default function profileAvatar(peer: Peer, message?: Message) {
  const container = div`.avatar`();
  const location = getPeerPhotoInputLocation(peer, message);
  let defaultPicture: HTMLElement | undefined;

  const preview = (src: string | null) => {
    if (!src) {
      defaultPicture = div`.avatar__standard${`color-${peerToColorCode(peer)}`}`(
        text(peerToInitials(peer)),
      );

      mount(container, defaultPicture);
    } else {
      if (defaultPicture) unmount(defaultPicture);
      mount(container, div`.avatar__picture`(img({ src })));
    }
  };

  // display default icon
  if (!location) {
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
