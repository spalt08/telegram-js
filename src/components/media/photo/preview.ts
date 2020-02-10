import { Photo, MessageCommon } from 'cache/types';
import { div, img } from 'core/html';
import { materialSpinner } from 'components/icons';
import { mount, unmount, listenOnce, listen } from 'core/dom';
import { getOrientation, getThumbnail, checkDimensions, getPhotoLocation, getSizeType, getSize } from 'helpers/photo';
import media from 'client/media';
import { main } from 'services';
import './preview.scss';
import { useInterface } from 'core/hooks';

const PHOTO_W_DIM = 100 / 320;
const PHOTO_H_DIM = 48 / 320;
const PHOTO_THUMBNAIL_MAX = 320;

export default function photoPreview(photo: Photo, message: MessageCommon) {
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

  const container = div`.photo-preview${orientation}`();
  const url = media.cached(location);

  if (!url && thumbnailUrl) {
    thumbnail = div`.photo-preview__thumbnail`(
      img({ src: thumbnailUrl, alt: 'Message photo' }),
    );
    mount(container, thumbnail);

    if (hasBackground) {
      background = div({ className: 'photo-preview__background', style: { backgroundImage: `url(${thumbnailUrl}` } });
      mount(container, background);
    }
  }

  container.style.width = `${box.width}px`;
  container.style.height = `${box.height}px`;

  const render = (src: string | null) => {
    if (preview) unmount(preview);
    if (loader) unmount(loader);

    if (thumbnail) {
      thumbnail.classList.add('removed');
      listenOnce(thumbnail, 'animationend', () => thumbnail && unmount(thumbnail));
    }

    if (src === null) return;

    preview = div`.photo-preview__preview${thumbnail ? 'animated' : ''}`(
      img({ src, alt: 'Message Photo' }),
    );

    listen(preview, 'click', () => {
      if (!preview) return;

      const rect = preview.getBoundingClientRect();
      main.showPopup('photo', { rect, photo, message });
    });

    mount(container, preview);
  };

  if (url === undefined) {
    loader = div`.photo-preview__loader`(materialSpinner());
    mount(container, loader);
    media.get(location, render, photo.dc_id);
  } else {
    render(url);
  }

  return useInterface(container, {
    getSize() {
      return box;
    },
  });
}
