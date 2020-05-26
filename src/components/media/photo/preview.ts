import { listen } from 'core/dom';
import { getInterface } from 'core/hooks';
import { PhotoOptions } from 'helpers/other';
import { Message, Peer, Photo } from 'mtproto-js';
import { main } from 'services';
import photoRenderer from './photo';


export default function photoPreview(photo: Photo.photo, peer: Peer, message: Message.message, options: PhotoOptions = {}) {
  if (photo._ !== 'photo') return null;

  const photoEl = photoRenderer(photo, options);

  if (message) {
    listen(photoEl, 'click', () => {
      if (!(photoEl instanceof HTMLElement)) return;

      const rect = getInterface(photoEl).rect();
      const thumbSrc = getInterface(photoEl).getImageSrc();

      main.showPopup('photo', { rect, options: { ...options, thumb: thumbSrc }, peer, photo, message });
    });
  }

  return photoEl;
}
