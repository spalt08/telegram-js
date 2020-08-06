import { img, div, canvas, nothing } from 'core/html';
import { Document } from 'mtproto-js';
import { listen, mount } from 'core/dom';
import { getDocumentLocation } from 'helpers/files';
import { file } from 'client/media';
import { StickerMimeType } from 'const';
import { isAndroid } from 'helpers/browser';
import { getSize, getPhotoLocation } from 'helpers/photo';
import { tgs } from 'components/ui';
import { useCacheRenderer } from './player';
import './sticker.scss';

type StickerOptions = {
  className?: string,
  size: string,
  onClick?: (sticker: Document) => void,
};

export default function stickerRenderer(sticker: Document.document, { onClick, size, className = '' }: StickerOptions) {
  switch (sticker.mime_type) {
    case StickerMimeType.TGS: {
      const width = parseInt(size, 10);
      const canvasSize = width * window.devicePixelRatio;

      const container = div`.sticker${className}`({ style: { width: size, height: size } });
      if (isAndroid) {
        if (width < 200) {
          if (sticker.thumbs && sticker.thumbs.length > 0) {
            const tsize = getSize(sticker.thumbs, width, width, 'contain');
            if (tsize) {
              const thumb = file(getPhotoLocation(sticker, tsize.type), { mime_type: 'image/webp' });
              container.style.backgroundImage = `url(${thumb})`;
            }
          }
        } else {
          const src = file(getDocumentLocation(sticker, ''), { mime_type: sticker.mime_type, dc_id: sticker.dc_id, size: sticker.size });
          const renderer = tgs({ src, className: 'sticker__tgs-polyfill', width, height: width, autoplay: true, loop: true });

          mount(container, renderer);
        }
      } else {
        const canvasEl = canvas`.sticker__canvas`({ width: canvasSize, height: canvasSize });
        mount(container, canvasEl);

        useCacheRenderer(canvasEl, sticker, canvasSize);
      }

      if (onClick) listen(container, 'click', () => onClick(sticker));

      return container;
    }

    case StickerMimeType.WebP: {
      const location = getDocumentLocation(sticker, '');
      const src = file(location, { dc_id: sticker.dc_id, size: sticker.size, mime_type: sticker.mime_type });
      const image = img`.sticker${className}`({ src, style: { width: size, height: size } });

      if (onClick) listen(image, 'click', () => onClick(sticker));

      return image;
    }

    default:
      return nothing;
  }
}
