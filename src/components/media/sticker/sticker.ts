import { img, div, canvas } from 'core/html';
import { Document } from 'mtproto-js';
import { listen } from 'core/dom';
import { getDocumentLocation } from 'helpers/files';
import { file } from 'client/media';
import { StickerMimeType } from 'const';
import './sticker.scss';
import { useCacheRenderer } from './player';

type StickerOptions = {
  className?: string,
  onClick?: (sticker: Document) => void,
};

export default function stickerRenderer(sticker: Document.document, { onClick, className = '' }: StickerOptions) {
  const image = img`.sticker${className}`();
  const location = getDocumentLocation(sticker, '');
  const src = file(location, { dc_id: sticker.dc_id, size: sticker.size, mime_type: sticker.mime_type });

  switch (sticker.mime_type) {
    case StickerMimeType.TGS: {
      // image.src = `/stickers/${sticker.id}.png`;

      // // cache sticker
      // listen(image, 'error', () => {
      //   image.style.opacity = '0';

      //   useObservable(image, loadSticker(sticker.id, src), (ready) => {
      //     if (ready) {
      //       image.src = '';
      //       image.src = `/stickers/${sticker.id}.png`;
      //       image.style.opacity = '';
      //     }
      //   });
      // });

      const canvasEl = canvas`.sticker__canvas`({ width: 140, height: 140 });
      // const context = canvasEl.getContext('2d');
      const container = div`.sticker${className}`(canvasEl);

      if (onClick) listen(container, 'click', () => onClick(sticker));

      useCacheRenderer(canvasEl, sticker);
      // if (context) loadSticker(sticker.id, src, context);
      return container;

      break;
    }

    case StickerMimeType.WebP: {
      image.src = src;
      break;
    }

    default:
  }

  if (onClick) listen(image, 'click', () => onClick(sticker));

  return image;
}
