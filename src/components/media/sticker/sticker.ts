import { div, img } from 'core/html';
import { Document } from 'cache/types';
import { mount, listenOnce, unmount } from 'core/dom';
import { getThumbnail } from 'helpers/photo';
import { getDocumentLocation } from 'helpers/files';
import media from 'client/media';
import { tgs } from 'components/ui';
import './sticker.scss';

type StickerOptions = {
  size: string,
  autoplay: boolean,
};

export default function stickerRenderer(sticker: Document, { size = '200px', autoplay = true }: StickerOptions) {
  const container = div`.sticker`({ style: { width: size, height: size } });
  const thumbnailUrl = getThumbnail(sticker.thumbs);

  let thumbnail: HTMLElement | undefined;

  if (thumbnailUrl) {
    thumbnail = div`.sticker__thumb`(
      img({ src: thumbnailUrl, alt: 'Sticker Preview' }),
    );

    mount(container, thumbnail);
  }

  const location = getDocumentLocation(sticker);

  media.get(location, (src: string) => {
    if (sticker.mime_type === 'application/x-tgsticker') {
      const animated = tgs({ src, className: 'sticker__tgs', autoplay, loop: true });
      mount(container, animated);

      if (thumbnail) {
        thumbnail.classList.add('removed');
        listenOnce(thumbnail, 'animationend', () => {
          unmount(thumbnail!);
        });
      }
      return;
    }

    if (sticker.mime_type === 'image/webp') {
      const stickerImage = img({ src, className: 'sticker__image' });
      mount(container, stickerImage);

      // remove thumbnail
      if (thumbnail) {
        thumbnail.classList.add('removed');
        listenOnce(thumbnail, 'animationend', () => {
          unmount(thumbnail!);
        });
      }
    }
  }, sticker.dc_id, sticker.mime_type);

  return container;
}
