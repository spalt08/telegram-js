import { getThumbnail } from 'helpers/photo';
import { Document } from 'cache/types';
import { img, div } from 'core/html';
import { mount } from 'core/dom';
import { getDocumentLocation } from 'helpers/files';
import './sticker.scss';
import { file } from 'services';
import { tgs } from 'components/ui';

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

  file.getFile(location, (src: string) => {
    const animated = tgs({ src, className: 'sticker__tgs' });
    mount(container, animated);
  }, document.dc_id, document.mime_type);

  return container;
}
