import { text, div } from 'core/html';
import { Document } from 'mtproto-js';
import { media } from 'services';
import stickerRenderer from './sticker';
import './set.scss';

/**
 * Sticker set
 */
export default function stickerSetRecent(onClick?: (sticker: Document.document) => void) {
  const elements = media.recentStickers.value.map((sticker) => (
    stickerRenderer(sticker, { size: '70px', onClick, className: 'sticker-set__preview' })
  ));

  return (
    div`.sticker-set`(
      div`.sticker-set__title`(text('Recent')),
      div`.sticker-set__items`(
        ...elements.map((stickerEl: Node) => div`.sticker-set__item`(stickerEl)),
      ),
    )
  );
}
