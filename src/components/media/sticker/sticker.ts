import { img } from 'core/html';
import { Document } from 'mtproto-js';
import { BehaviorSubject } from 'rxjs';
import { listen } from 'core/dom';
import { getDocumentLocation } from 'helpers/files';
import { file } from 'client/media';
import { getCanvasWorker, listenMessage } from 'client/context';
import { StickerMimeType } from 'const';
import './sticker.scss';
import { useObservable } from 'core/hooks';

type StickerOptions = {
  className?: string,
  onClick?: (sticker: Document) => void,
};

const readySubject = new Map<string, BehaviorSubject<boolean>>();
function loadSticker(id: string, src: string) {
  let subject = readySubject.get(src);
  if (subject) return subject;

  readySubject.set(src, subject = new BehaviorSubject(false));

  if ('OffscreenCanvas' in window) {
    getCanvasWorker().postMessage({ type: 'cache_sticker', id, src, pixelRatio: window.devicePixelRatio });
  }
  return subject;
}

listenMessage('sticker_cached', ({ src }) => {
  console.log('ready');
  const subject = readySubject.get(src);
  if (subject) subject.next(true);
});

export default function stickerRenderer(sticker: Document.document, { onClick, className = '' }: StickerOptions) {
  const image = img`.sticker${className}`();
  const location = getDocumentLocation(sticker, '');
  const src = file(location, { dc_id: sticker.dc_id, size: sticker.size, mime_type: sticker.mime_type });

  switch (sticker.mime_type) {
    case StickerMimeType.TGS:
      image.src = `/stickers/${sticker.id}.png`;

      // cache sticker
      listen(image, 'error', () => {
        image.style.opacity = '0';

        useObservable(image, loadSticker(sticker.id, src), (ready) => {
          if (ready) {
            image.src = '';
            image.src = `/stickers/${sticker.id}.png`;
            image.style.opacity = '';
          }
        });
      });

      break;

    case StickerMimeType.WebP: {
      image.src = src;
      break;
    }

    default:
  }

  if (onClick) listen(image, 'click', () => onClick(sticker));

  return image;
}
