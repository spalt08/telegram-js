import { div, text, img } from 'core/html';
import { Peer, Message } from 'cache/types';
import { peerToInitials, peerToColorCode } from 'cache/accessors';
import { getPeerPhotoInputLocation } from 'helpers/photo';
import { file } from 'services';
import { unmount, listenOnce, mount } from 'core/dom';
import './avatar.scss';

export default function profileAvatar(peer: Peer, message?: Message) {
  const colorCode = peerToColorCode(peer);
  const standart = div`.avatar__standart${`color-${colorCode}`}`(
    text(peerToInitials(peer)),
  );
  const container = div`.avatar`(standart);

  const location = getPeerPhotoInputLocation(peer, message);

  if (location) {
    file.getFile(location, (src) => {
      if (!src) return;

      standart.classList.add('removed');
      listenOnce(standart, 'animationend', () => unmount(standart));

      const picture = div`.avatar__picture`(
        img({ src }),
      );

      mount(container, picture);
    });
  }

  return container;
}
