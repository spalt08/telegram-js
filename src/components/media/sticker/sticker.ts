import { div, img } from 'core/html';
import { Document } from 'mtproto-js';
import { mount, unmount, listen } from 'core/dom';
import { getThumbnail, getSize, getPhotoLocation } from 'helpers/photo';
import { getDocumentLocation } from 'helpers/files';
import { hasCached, file } from 'client/media';
import { tgs } from 'components/ui';
import { useInterface, getInterface } from 'core/hooks';
import { StickerMimeType } from 'const';
import './sticker.scss';

type StickerOptions = {
  size: string,
  autoplay: boolean,
  playOnHover?: boolean,
  onClick?: (sticker: Document) => void,
};

export default function stickerRenderer(sticker: Document.document,
  { size = '200px', autoplay = true, playOnHover = false, onClick }: StickerOptions) {
  let thumbnail: HTMLElement | undefined;
  let animated: ReturnType<typeof tgs> | undefined;

  const container = div`.sticker`({ style: { width: size, height: size } });

  const location = getDocumentLocation(sticker, '');
  const src = file(location, { dc_id: sticker.dc_id, size: sticker.size, mime_type: sticker.mime_type });

  // diplay thumbnail
  if (sticker.thumbs && sticker.thumbs.length > 0) {
    const tsize = getSize(sticker.thumbs, 200, 200, 'cover');

    if (tsize) {
      const loc = getPhotoLocation(sticker, tsize.type);
      thumbnail = img({ className: 'sticker__thumb', src: file(loc, {}), alt: 'Sticker Preview' });
    } else {
      const thumbSrc = getThumbnail(sticker.thumbs!);
      if (thumbSrc) thumbnail = img({ className: 'sticker__thumb', src: getThumbnail(sticker.thumbs!), alt: 'Sticker Preview' });
    }

    if (thumbnail) mount(container, thumbnail);
  }

  const removeThumb = () => {
    if (thumbnail) {
      thumbnail.classList.add('removed');
      thumbnail.onanimationend = () => {
        unmount(thumbnail!);
        thumbnail = undefined;
      };
    }
  };

  switch (sticker.mime_type) {
    case StickerMimeType.TGS:
      // animated = tgs({ src, className: `sticker__tgs${thumbnail ? ' animated' : ''}`, autoplay, loop: true, playOnHover, onLoad: removeThumb });
      // mount(container, animated);
      break;

    case StickerMimeType.WebP: {
      const image = img({ src, className: `sticker__image${thumbnail ? ' animated' : ''}` });
      mount(container, image);
      listen(image, 'load', removeThumb);
      break;
    }

    default:
  }


  if (onClick) listen(container, 'click', () => onClick(sticker));

  return useInterface(container, {
    play() { if (animated) getInterface(animated).play(); },
    pause() { if (animated) getInterface(animated).pause(); },
  });
}
