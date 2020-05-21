import { Photo, Document } from 'mtproto-js';
import { img, nothing } from 'core/html';
import { watchVisibility } from 'core/dom';
import { getPhotoLocation, getThumbnailService } from 'helpers/photo';
import { useInterface } from 'core/hooks';
import { PhotoOptions } from 'helpers/other';
import { file } from 'client/media';
import './photo.scss';

export default function photoRenderer(photo: Photo.photo | Document.document, options: PhotoOptions) {
  if (photo?._ !== 'photo' && photo?._ !== 'document') return nothing;

  const sizes = (photo._ === 'photo' ? photo.sizes : photo.thumbs) || [];
  const srcs: string[] = [];
  let defaultSrc: string = '';
  let orientation = 'landscape';

  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];

    if (size._ === 'photoSize') {
      const location = getPhotoLocation(photo, size.type);
      const src = file(location, { dc_id: photo.dc_id, size: size.size });

      srcs.push(`${src} ${size.w}w`);

      if (!defaultSrc) defaultSrc = src;
      if (size.w < size.h) orientation = 'portrait';
    }
  }

  const image = img`.photo2`();

  // apply styles
  image.classList.add(`-${orientation}`);
  if (options.fit) image.classList.add(`-${options.fit}`);
  if (options.width) image.style.width = `${options.width}px`;
  if (options.height) image.style.height = `${options.height}px`;
  if (options.minWidth) image.style.minWidth = `${options.minWidth}px`;
  if (options.minHeight) image.style.minHeight = `${options.minHeight}px`;

  const { thumb = true } = options;

  // diplay thumbnail
  if (thumb) {
    const thumbUrl = getThumbnailService((photo._ === 'photo' ? photo.sizes : photo.thumbs) ?? []);
    if (thumbUrl) image.style.backgroundImage = `url(${thumbUrl})`;
  }

  watchVisibility(image, (visible) => {
    if (visible && !image.src) {
      image.srcset = srcs.join(', ');
    }
  });

  // interfaces
  const rect = () => image.getBoundingClientRect();
  const setThumb = (url: string, w: number) => {
    image.srcset = `${url} ${w}w`;
  };

  return useInterface(image, { rect, setThumb });
}
