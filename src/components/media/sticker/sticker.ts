import { img, div, canvas, nothing } from 'core/html';
import { Document } from 'mtproto-js';
import { listen } from 'core/dom';
import { getDocumentLocation } from 'helpers/files';
import { file } from 'client/media';
import { StickerMimeType } from 'const';
import './sticker.scss';
import { useCacheRenderer } from './player';

type StickerOptions = {
  className?: string,
  size: string,
  onClick?: (sticker: Document) => void,
};

export default function stickerRenderer(sticker: Document.document, { onClick, size, className = '' }: StickerOptions) {
  switch (sticker.mime_type) {
    case StickerMimeType.TGS: {
      const canvasSize = parseInt(size, 10) * window.devicePixelRatio;
      const canvasEl = canvas`.sticker__canvas`({ width: canvasSize, height: canvasSize });
      const container = div`.sticker${className}`({ style: { width: size, height: size } }, canvasEl);

      if (onClick) listen(container, 'click', () => onClick(sticker));

      useCacheRenderer(canvasEl, sticker, canvasSize);
      // if (canvasSize < 200) useCacheRenderer(canvasEl, sticker, canvasSize);
      // else useLottieRenderer(canvasEl, sticker);

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
