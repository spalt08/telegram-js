import { text, div } from 'core/html';
import { Document } from 'client/schema';
import { useInterface, getInterface } from 'core/hooks';
import { media } from 'services';
import stickerRenderer from './sticker';
import './set.scss';

/**
 * Sticker set
 */
export default function stickerSetRecent(onClick?: (sticker: Document.document) => void) {
  const elements = media.recentStickers.value.map((sticker) => stickerRenderer(sticker, { size: '100%', autoplay: false, onClick }));

  const container = (
    div`.sticker-set`(
      div`.sticker-set__title`(text('Recent')),
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
