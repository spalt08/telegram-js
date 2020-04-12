import { Photo, Document } from 'mtproto-js';
import { div, img, nothing } from 'core/html';
import { materialSpinner } from 'components/icons';
import { mount, unmount, listenOnce } from 'core/dom';
import { getThumbnail, getPhotoLocation, getSize, PhotoFitMode } from 'helpers/photo';
import { download, cached } from 'client/media';
import './photo.scss';
import { useInterface, useOnMount } from 'core/hooks';

export type PhotoOptions = {
  fit?: PhotoFitMode,
  width?: number,
  height?: number,
  minWidth?: number,
  minHeight?: number,
  thumb?: boolean,
  showLoader?: boolean,
};

export default function photoRenderer(photo: Photo.photo | Document.document,
  { width, height, fit = 'contain', thumb = true, minWidth, minHeight, showLoader = true }: PhotoOptions) {
  if (photo?._ !== 'photo' && photo?._ !== 'document') return nothing;

  const size = getSize((photo._ === 'photo' ? photo.sizes : photo.thumbs) ?? [], width, height, fit);
  if (!size) return nothing;

  const container = div`.photo`();

  let thumbnail: HTMLImageElement | undefined;
  let loader: HTMLElement | undefined;
  let background: HTMLElement | undefined;
  let image: HTMLElement | undefined;

  const orientation = size.w >= size.h ? 'landscape' : 'portrait';
  const location = getPhotoLocation(photo, size.type);
  let url = cached(location);
  const loadedFromCache = !!url;

  let thumbSrc: string | null = null;

  // apply classes
  container.classList.add(orientation);
  container.classList.add(fit);

  const dim = size.w / size.h;

  if (fit === 'contain') {
    if (orientation === 'landscape' && width) {
      if (height && width / dim > height) {
        container.style.height = `${Math.min(size.h, height)}px`;
        container.style.width = `${Math.min(size.w, height * dim)}px`;
      } else {
        container.style.width = `${Math.min(width, size.w)}px`;
        container.style.height = `${Math.min(size.h, width / dim)}px`;
      }
    }
    if (orientation === 'portrait' && height) {
      if (width && height * dim > width) {
        container.style.width = `${Math.min(width, size.w)}px`;
        container.style.height = `${Math.min(size.h, width / dim)}px`;
      } else {
        container.style.height = `${Math.min(size.h, height)}px`;
        container.style.width = `${Math.min(size.w, height * dim)}px`;
      }
    }
  } else {
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
  }

  // diplay thumbnail
  if (!url && thumb) {
    thumbSrc = getThumbnail((photo._ === 'photo' ? photo.sizes : photo.thumbs) ?? []);

    if (thumbSrc) {
      thumbnail = img({ className: 'photo__thumbnail', src: thumbSrc, alt: 'Message photo' });
      mount(container, thumbnail);
    }
  }

  // show background
  if (thumbSrc && fit === 'contain' && ((width && minHeight && width / dim < minHeight) || (height && minWidth && height * dim < minWidth))) {
    background = div({ className: 'photo__background', style: { backgroundImage: `url(${thumbSrc}` } });
    mount(container, background);

    if (height && minWidth && height * dim < minWidth) container.style.width = `${minWidth}px`;
    if (width && minHeight && width / dim < minHeight) container.style.height = `${minHeight}px`;
  }

  const render = (src: string | null) => {
    if (src === null) return;
    if (loader) unmount(loader);
    if (image) unmount(image);

    url = src;

    if (thumbnail) {
      thumbnail.classList.add('removed');
      listenOnce(thumbnail, 'animationend', () => thumbnail && unmount(thumbnail));
    }

    mount(container, image = img`${loadedFromCache ? '' : 'unblur'}`({ src, alt: 'Message Photo' }), thumbnail);
  };

  // load or render cached
  if (!url) {
    useOnMount(container, () => {
      if (!url) {
        if (showLoader) {
          loader = div`.photo__loader`(materialSpinner());
          mount(container, loader);
        }

        download(location, { size: size.size, dc_id: photo.dc_id }, render);
      }
    });
  } else {
    render(url);
  }

  return useInterface(container, {
    rect: () => fit === 'cover' ? container.getBoundingClientRect() : (image || thumbnail || container).getBoundingClientRect(),
    setThumb: (src: string) => {
      if (thumbnail) {
        thumbnail.src = src;
        thumbnail.classList.add('no-blur');
      }
    },
  });
}
