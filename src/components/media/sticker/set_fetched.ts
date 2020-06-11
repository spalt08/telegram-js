import { text, div } from 'core/html';
import { Document, StickerSet } from 'mtproto-js';
import stickerRenderer from './sticker';
import './set.scss';

/**
 * Sticker set
 */
export default function stickerSetFetched(set: StickerSet, stickers: Document.document[], onClick?: (sticker: Document.document) => void) {
  const elements = stickers.map((sticker) => stickerRenderer(sticker, { onClick, className: 'sticker-set__preview', size: '70px' }));

  return (
    div`.sticker-set`(
      div`.sticker-set__title`(text(set.title)),
      div`.sticker-set__items`(
        ...elements.map((stickerEl: Node) => div`.sticker-set__item`(stickerEl)),
      ),
    )
  );
}
