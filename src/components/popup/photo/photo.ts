import { div, img } from 'core/html';
import { MessageCommon, PhotoNotEmpty } from 'cache/types';
import './photo.scss';
import media from 'client/media';
import { getSizeType, getPhotoLocation } from 'helpers/photo';
import { listen, listenOnce } from 'core/dom';
import { getInterface, hasInterface } from 'core/hooks';
import { PopupInterface } from '../interface';

type Props = {
  rect: DOMRect,
  photo: PhotoNotEmpty,
  message: MessageCommon,
};

const PHOTO_THUMBNAIL_MAX = 320;

/**
 * Media photo popup handler
 */
export default function photo({ rect, photo, message }: Props) {
  const type = getSizeType(photo.sizes, PHOTO_THUMBNAIL_MAX);
  const location = getPhotoLocation(photo, type);
  const src = media.cached(location);

  const image = img`.photo_full`({ src });
  const element = div`.popup`(image);

  listen(image, 'load', () => {
    const next = image.getBoundingClientRect();
    const dx = rect.left - next.left;
    const dy = rect.top - next.top;
    const scale = rect.width / next.width;

    image.style.transformOrigin = 'top left';
    image.style.opacity = '0';
    image.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;

    listenOnce(image, 'transitionend', () => {
      image.classList.remove('transition');
      image.style.transformOrigin = '';
    });

    requestAnimationFrame(() => {
      image.classList.add('transition');
      image.style.transform = '';
      image.style.opacity = '1';
    });
  });

  listen(element, 'click', () => {
    const current = image.getBoundingClientRect();
    const dx = rect.left - current.left;
    const dy = rect.top - current.top;
    const scale = rect.width / current.width;

    image.classList.add('transition');
    image.style.transformOrigin = 'top left';
    image.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;

    if (hasInterface<PopupInterface>(element.parentElement)) {
      getInterface(element.parentElement).fade();
    }

    listenOnce(image, 'transitionend', () => {
      setTimeout(() => {
        if (hasInterface<PopupInterface>(element.parentElement)) {
          getInterface(element.parentElement).close();
        }
      }, 100);
    });
  });

  return element;
}
