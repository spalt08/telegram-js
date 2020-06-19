import { file, hasCached } from 'client/media';
import { mount, unmount, listen } from 'core/dom';
import { div, img, nothing } from 'core/html';
import { usePhotoSize } from 'helpers/files';
import { PhotoOptions } from 'helpers/other';
import { getPhotoLocation, getSize, getThumbnail } from 'helpers/photo';
import { Document, Photo } from 'mtproto-js';
import './photo.scss';
import { useInterface } from 'core/hooks';

type OpenProps = { rect: DOMRect, thumb: string };

export default function photoRenderer(photo: Photo.photo | Document.document, options: PhotoOptions, onOpen?: (props: OpenProps) => void) {
  if (photo?._ !== 'photo' && photo?._ !== 'document') return nothing;

  const size = getSize((photo._ === 'photo' ? photo.sizes : photo.thumbs) ?? [], options.width, options.height, options.fit);

  let thumbnail: HTMLImageElement | undefined;
  let background: HTMLElement | undefined;
  let thumbSrc: string | null = null;

  const { width, height, minHeight, minWidth, fit = 'contain', thumb = true } = options;
  const dim = size ? size.w / size.h : 0;
  const location = size ? getPhotoLocation(photo, size.type) : undefined;

  const src = location ? file(location, {}) : '';
  const image = img`.photo__content`({ src });
  const container = div`.photo${options.className}`(src ? image : nothing);

  // apply classes
  if (options.fit) container.classList.add(options.fit);
  if (size) {
    usePhotoSize(container, size, options);
    container.classList.add(size.w >= size.h ? 'landscape' : 'portrait');
  }

  // diplay thumbnail
  if (thumb) {
    if (typeof thumb === 'string') {
      thumbSrc = thumb;
      thumbnail = img({ className: 'photo__thumbnail', src: thumb, alt: 'Message photo' });
      mount(container, thumbnail);
    } else {
      hasCached(src, (exists) => {
        if (exists) return;
        if (!thumbSrc) thumbSrc = getThumbnail((photo._ === 'photo' ? photo.sizes : photo.thumbs) ?? []);

        thumbnail = img({ className: 'photo__thumbnail', src: thumbSrc, alt: 'Message photo' });
        mount(container, thumbnail);
      });
    }
  }

  // show background
  if (size && fit === 'contain' && ((width && minHeight && width / dim < minHeight) || (height && minWidth && height * dim < minWidth))) {
    if (!thumbSrc) thumbSrc = getThumbnail((photo._ === 'photo' ? photo.sizes : photo.thumbs) ?? []);
    background = img({ className: 'photo__background', src: thumbSrc });
    mount(container, background);

    if (height && minWidth && height * dim < minWidth) container.style.width = `${minWidth}px`;
    if (width && minHeight && width / dim < minHeight) container.style.height = `${minHeight}px`;
  }

  let isLoaded = false;

  image.onload = () => {
    isLoaded = true;
    if (thumbnail) {
      unmount(thumbnail);
    }
  };

  const open = () => {
    const rect = fit === 'cover' ? container.getBoundingClientRect() : (image || container).getBoundingClientRect();
    return { rect, thumb: isLoaded ? src : (thumbSrc || '') };
  };

  if (onOpen) {
    listen(container, 'click', () => onOpen(open()));
  }

  return useInterface(container, { open });
}
