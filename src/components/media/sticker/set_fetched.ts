import { text, div } from 'core/html';
import { Document, StickerSet } from 'mtproto-js';
import { useInterface, getInterface } from 'core/hooks';
import stickerRenderer from './sticker';
import './set.scss';

/**
 * Sticker set
 */
export default function stickerSetFetched(set: StickerSet, stickers: Document.document[], onClick?: (sticker: Document.document) => void) {
  const elements = stickers.map((sticker) => stickerRenderer(sticker, { size: '70px', autoplay: true, onClick }));

  const container = (
    div`.sticker-set`(
      div`.sticker-set__title`(text(set.title)),
      div`.sticker-set__items`(
        ...elements.map((stickerEl: HTMLElement) => div`.sticker-set__item`(stickerEl)),
      ),
    )
  );

  return useInterface(container, {
    playAll() {
      for (let i = 0; i < elements.length; i++) getInterface(elements[i]).play();
    },
    pauseAll() {
      for (let i = 0; i < elements.length; i++) getInterface(elements[i]).pause();
    },
  });
}
