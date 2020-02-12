import { Photo, MessageCommon, Peer } from 'cache/types';
import { div, img, nothing } from 'core/html';
import { materialSpinner } from 'components/icons';
import { mount, unmount, listenOnce, listen } from 'core/dom';
import { getOrientation, getThumbnail, /* checkDimensions, */ getPhotoLocation, getSizeType, getSize } from 'helpers/photo';
import media from 'client/media';
import { main } from 'services';
import './preview.scss';
import { useInterface } from 'core/hooks';

// const PHOTO_W_DIM = 100 / 320;
// const PHOTO_H_DIM = 48 / 320;
const PHOTO_THUMBNAIL_MAX = 320;

export default function photoPreview(photo: Photo, peer: Peer, message: MessageCommon, adjustSize = true, showSpinner = true) {
  if (photo._ !== 'photo') return nothing;

  const orientation = getOrientation(photo.sizes);
  const thumbnailUrl = getThumbnail(photo.sizes);
  const type = getSizeType(photo.sizes, PHOTO_THUMBNAIL_MAX);
  const location = getPhotoLocation(photo, type);
  const box = getSize(photo.sizes, PHOTO_THUMBNAIL_MAX);
  // to do remove
  const hasBackground = false; // checkDimensions(photo.sizes, PHOTO_W_DIM, PHOTO_H_DIM);

  let thumbnail: HTMLElement | undefined;
  let background: HTMLElement | undefined;
  let preview: HTMLElement | undefined;
  let loader: HTMLElement | undefined;

  const container = div`.photo-preview${adjustSize ? orientation : ''}`();
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

  if (adjustSize) {
    container.style.width = `${box.width}px`;
    container.style.height = `${box.height}px`;
  }

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
      main.showPopup('photo', { rect, photo, peer, message });
    });

    mount(container, preview);
  };

  if (url === undefined) {
    if (showSpinner) {
      loader = div`.photo-preview__loader`(materialSpinner());
      mount(container, loader);
    }
    media.get(location, render, photo.dc_id);
  } else {
    render(url);
  }

  return useInterface(container, {
    needsShadow: true,
    getSize() {
      return box;
    },
  });
}
