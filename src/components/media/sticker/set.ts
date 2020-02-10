import { text, div } from 'core/html';
import { Document } from 'cache/types';
import stickerRenderer from './sticker';
import './set.scss';

/**
 * Sticker set
 */
export default function stickerSet(key: string, stickers: Document[], onClick?: (sticker: Document) => void) {
  return (
    div`.sticker-set`(
      div`.sticker-set__title`(text(key)),
      div`.sticker-set__items`(
        ...stickers.map((sticker: Document) => div`.sticker-set__item`(stickerRenderer(sticker, { size: '100%', autoplay: true, onClick }))),
      ),
    )
  );
}
