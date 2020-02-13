import { Photo, MessageCommon } from 'cache/types';
import { listen } from 'core/dom';
import { getInterface } from 'core/hooks';
import { main } from 'services';
import photoRenderer, { PhotoOptions } from './photo';
import './preview.scss';


export default function photoPreview(photo: Photo, message?: MessageCommon, options: PhotoOptions = {}) {
  if (photo._ !== 'photo') return null;

  const photoEl = photoRenderer(photo, options);

  if (message) {
    listen(photoEl, 'click', () => {
      if (!(photoEl instanceof HTMLElement)) return;

      const rect = getInterface(photoEl).rect();
      if (rect) main.showPopup('photo', { rect, photo, message });
    });
  }

  return photoEl;
}
