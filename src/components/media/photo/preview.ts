import { Photo, MessageCommon, Peer } from 'cache/types';
import { listen } from 'core/dom';
import { getInterface } from 'core/hooks';
import { main } from 'services';
import photoRenderer, { PhotoOptions } from './photo';


export default function photoPreview(photo: Photo, peer: Peer, message: MessageCommon, options: PhotoOptions = {}) {
  if (photo._ !== 'photo') return null;

  const photoEl = photoRenderer(photo, options);

  if (message) {
    listen(photoEl, 'click', () => {
      if (!(photoEl instanceof HTMLElement)) return;

      const rect = getInterface(photoEl).rect();

      if (rect) main.showPopup('photo', { rect, options, peer, photo, message });
    });
  }

  return photoEl;
}
