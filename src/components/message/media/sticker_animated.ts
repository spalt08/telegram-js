import { getThumbnail } from 'helpers/photo';
import { Document } from 'cache/types';
import { img, div } from 'core/html';
import { mount, listenOnce, unmount } from 'core/dom';
import { getDocumentLocation } from 'helpers/files';
import { tgs } from 'components/ui';
import client from 'client/client';
import './sticker.scss';

export default function mediaAnimatedSticker(document: Document) {
  const container = div`.sticker`();
  const thumbnailUrl = getThumbnail(document.thumbs);

  let thumbnail: HTMLElement | undefined;

  if (thumbnailUrl) {
    thumbnail = div`.sticker__thumb`(
      img({ src: thumbnailUrl, alt: 'Sticker Preview' }),
    );

    mount(container, thumbnail);
  }

  const location = getDocumentLocation(document);

  client.getFile(location, (src: string) => {
    const animated = tgs({ src, className: 'sticker__tgs', autoplay: true, loop: true });
    mount(container, animated);

    if (thumbnail) {
      thumbnail.classList.add('removed');
      listenOnce(thumbnail, 'animationend', () => {
        unmount(thumbnail!);
      });
    }
  }, document.dc_id, document.mime_type);

  return container;
}
