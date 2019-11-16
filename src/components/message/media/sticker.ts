import { getThumbnail } from 'helpers/photo';
import { Document } from 'cache/types';
import { img, div } from 'core/html';
import { mount, listenOnce, unmount } from 'core/dom';
import { getDocumentLocation } from 'helpers/files';
import { file } from 'services';
import './sticker.scss';

export default function mediaSticker(document: Document) {
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

  file.getFile(location, (src: string) => {
    const sticker = img({ src, className: 'sticker__image' });
    mount(container, sticker);

    if (thumbnail) {
      thumbnail.classList.add('removed');
      listenOnce(thumbnail, 'animationend', () => {
        unmount(thumbnail!);
      });
    }
  }, document.dc_id, document.mime_type);

  return container;
}