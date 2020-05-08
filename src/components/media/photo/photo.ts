import { Photo, Document } from 'mtproto-js';
import { div, img, nothing } from 'core/html';
import { mount, listenOnce, unmount } from 'core/dom';
import { getThumbnail, getSize, getPhotoLocation } from 'helpers/photo';
import './photo.scss';
import { useInterface } from 'core/hooks';
import { PhotoOptions } from 'helpers/other';
import { usePhotoSize } from 'helpers/files';
import { file, hasCached } from 'client/media';

export default function photoRenderer(photo: Photo.photo | Document.document, options: PhotoOptions) {
  if (photo?._ !== 'photo' && photo?._ !== 'document') return nothing;

  const size = getSize((photo._ === 'photo' ? photo.sizes : photo.thumbs) ?? [], options.width, options.height, options.fit);
  if (!size) return nothing;

  let thumbnail: HTMLImageElement | undefined;
  let background: HTMLElement | undefined;
  let thumbSrc: string | null = null;

  const { width, height, minHeight, minWidth, fit = 'contain', thumb = true } = options;
  const dim = size.w / size.h;
  const location = getPhotoLocation(photo, size.type);

  const src = file(location, {});
  const image = img`.photo__content`({ src });
  const container = div`.photo`(image);

  // apply classes
  if (options.fit) container.classList.add(options.fit);
  usePhotoSize(container, size, options);
  container.classList.add(size.w >= size.h ? 'landscape' : 'portrait');

  // diplay thumbnail
  if (thumb) {
    hasCached(src, (exists) => {
      if (exists) return;
      if (!thumbSrc) thumbSrc = getThumbnail((photo._ === 'photo' ? photo.sizes : photo.thumbs) ?? []);

      thumbnail = img({ className: 'photo__thumbnail', src: thumbSrc, alt: 'Message photo' });
      mount(container, thumbnail);
    });
  }

  // show background
  if (fit === 'contain' && ((width && minHeight && width / dim < minHeight) || (height && minWidth && height * dim < minWidth))) {
    if (!thumbSrc) thumbSrc = getThumbnail((photo._ === 'photo' ? photo.sizes : photo.thumbs) ?? []);
    background = img({ className: 'photo__background', src: thumbSrc });
    mount(container, background);

    if (height && minWidth && height * dim < minWidth) container.style.width = `${minWidth}px`;
    if (width && minHeight && width / dim < minHeight) container.style.height = `${minHeight}px`;
  }

  image.onload = () => {
    if (thumbnail) {
      thumbnail.classList.add('removed');
      listenOnce(thumbnail, 'animationend', () => thumbnail && unmount(thumbnail));
    }
  };


  // const render = (src: string | null) => {
  //   if (src === null) return;
  //   if (loader) unmount(loader);
  //   if (image) unmount(image);

  //   url = src;

  //   if (thumbnail) {
  //     thumbnail.classList.add('removed');
  //     listenOnce(thumbnail, 'animationend', () => thumbnail && unmount(thumbnail));
  //   }

  //   mount(container, image = img`${loadedFromCache ? '' : 'unblur'}`({ src, alt: 'Message Photo' }), thumbnail);
  // };

  // // load or render cached
  // if (!url) {
  //   useOnMount(container, () => {
  //     if (!url) {
  //       if (showLoader) {
  //         loader = div`.photo__loader`(materialSpinner());
  //         mount(container, loader);
  //       }

  //       download(location, { size: size.size, dc_id: photo.dc_id }, render);
  //     }
  //   });
  // } else {
  //   render(url);
  // }

  // interfaces
  const rect = () => fit === 'cover' ? container.getBoundingClientRect() : (image || thumbnail || container).getBoundingClientRect();
  const setThumb = (url: string) => {
    if (thumbnail) {
      thumbnail.src = url;
      thumbnail.classList.add('no-blur');
    }
  };

  return useInterface(container, { rect, setThumb });
}
