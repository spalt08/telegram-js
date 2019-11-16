import { Photo } from 'cache/types';
import { div, img } from 'core/html';
import { materialSpinner } from 'components/icons';
import { mount } from 'core/dom';
import { getOrientation, getThumbnail, checkDimensions } from 'helpers/photo';
import './photo.scss';

const PHOTO_W_DIM = 100 / 320;
const PHOTO_H_DIM = 48 / 320;

export default function mediaPhoto(photo: Photo) {
  if (photo._ !== 'photo') return null;

  const orientation = getOrientation(photo.sizes);
  const container = div`.photo${orientation}`();
  const loader = div`.photo__loader`(materialSpinner());
  const thumbnailUrl = getThumbnail(photo.sizes);

  const hasBackground = checkDimensions(photo.sizes, PHOTO_W_DIM, PHOTO_H_DIM);

  if (thumbnailUrl) {
    const thumbnail = div`.photo__thumbnail`(
      img({ src: thumbnailUrl, alt: 'Message photo' }),
    );
    mount(container, thumbnail);

    if (hasBackground) {
      const background = div({ className: 'photo__background', style: { backgroundImage: `url(${thumbnailUrl}` } });
      mount(container, background);
    }
  }

  mount(container, loader);

  return container;
}
