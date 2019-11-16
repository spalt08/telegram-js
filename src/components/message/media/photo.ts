import { Photo } from 'cache/types';
import { div, img } from 'core/html';
import { materialSpinner, back } from 'components/icons';
import { mount, unmount } from 'core/dom';
import { getOrientation, getThumbnail, checkDimensions, getPhotoLocation } from 'helpers/photo';
import { file } from 'services';
import './photo.scss';

const PHOTO_W_DIM = 100 / 320;
const PHOTO_H_DIM = 48 / 320;

export default function mediaPhoto(photo: Photo) {
  if (photo._ !== 'photo') return null;

  const orientation = getOrientation(photo.sizes);
  const container = div`.photo${orientation}`();
  const loader = div`.photo__loader`(materialSpinner());
  const thumbnailUrl = getThumbnail(photo.sizes);

  let thumbnail: HTMLElement | undefined;
  let background: HTMLElement | undefined;
  let preview: HTMLElement | undefined;

  const hasBackground = checkDimensions(photo.sizes, PHOTO_W_DIM, PHOTO_H_DIM);

  if (thumbnailUrl) {
    thumbnail = div`.photo__thumbnail`(
      img({ src: thumbnailUrl, alt: 'Message photo' }),
    );
    mount(container, thumbnail);

    if (hasBackground) {
      background = div({ className: 'photo__background', style: { backgroundImage: `url(${thumbnailUrl}` } });
      mount(container, background);
    }
  }

  mount(container, loader);

  const location = getPhotoLocation(photo);
  file.getFile(location, (src) => {
    if (background) background.style.backgroundImage = `url(${src})`;
    if (thumbnail) unmount(thumbnail);
    if (preview) unmount(preview);
    unmount(loader);

    preview = div`.photo__preview`(
      img({ src, alt: 'Message Photo' }),
    );

    mount(container, preview);
  });

  return container;
}
