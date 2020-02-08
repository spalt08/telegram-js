import { Photo, MessageCommon } from 'cache/types';
import { div, img } from 'core/html';
import { materialSpinner } from 'components/icons';
import { mount, unmount, listenOnce, listen } from 'core/dom';
import { getOrientation, getThumbnail, checkDimensions, getPhotoLocation, getSizeType, getSize } from 'helpers/photo';
import { useInterface } from 'core/hooks';
import media from 'client/media';
import './photo.scss';
import { main } from 'services';

const PHOTO_W_DIM = 100 / 320;
const PHOTO_H_DIM = 48 / 320;
const PHOTO_THUMBNAIL_MAX = 320;

export default function mediaPhoto(photo: Photo, message: MessageCommon) {
  if (photo._ !== 'photo') return null;

  const orientation = getOrientation(photo.sizes);
  const thumbnailUrl = getThumbnail(photo.sizes);
  const type = getSizeType(photo.sizes, PHOTO_THUMBNAIL_MAX);
  const location = getPhotoLocation(photo, type);
  const box = getSize(photo.sizes, PHOTO_THUMBNAIL_MAX);
  const hasBackground = checkDimensions(photo.sizes, PHOTO_W_DIM, PHOTO_H_DIM);

  let thumbnail: HTMLElement | undefined;
  let background: HTMLElement | undefined;
  let preview: HTMLElement | undefined;
  let loader: HTMLElement | undefined;

  const container = div`.photo${orientation}`();

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

  container.style.width = `${box.width}px`;
  container.style.height = `${box.height}px`;

  const resolve = (src: string | null) => {
    if (preview) unmount(preview);
    if (loader) unmount(loader);

    if (thumbnail) {
      thumbnail.classList.add('removed');
      listenOnce(thumbnail, 'animationend', () => thumbnail && unmount(thumbnail));
    }

    if (src === null) return;

    preview = div`.photo__preview`(
      img({ src, alt: 'Message Photo' }),
    );

    listen(preview, 'click', () => {
      const rect = preview?.getBoundingClientRect();
      main.showPopup('photo', { rect, photo, message });
    });

    mount(container, preview);
  };

  const url = media.cached(location);

  if (url === undefined) {
    loader = div`.photo__loader`(materialSpinner());
    mount(container, loader);
    media.get(location, resolve, photo.dc_id);
  } else {
    resolve(url);
  }

  return useInterface(container, {
    needsShadow: true,
    getSize() {
      return box;
    },
  });
}
