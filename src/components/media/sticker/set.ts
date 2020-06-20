import { text, div } from 'core/html';
import { Document } from 'mtproto-js';
import { stickerSetCache } from 'cache';
import { useObservable } from 'core/hooks';
import { mount } from 'core/dom';
import stickerRenderer from './sticker';
import './set.scss';

/**
 * Sticker set
 */
export default function stickerSet(setId: string, onClick?: (sticker: Document) => void) {
  // to do handle updates
  const set = stickerSetCache.get(setId);

  if (!set) return div();

  const titleNode = text(set.title);
  const itemsEl = div`.sticker-set__items`();
  const placeholders: HTMLElement[] = new Array(set.count);
  const container = (
    div`.sticker-set`(
      div`.sticker-set__title`(titleNode),
      itemsEl,
    )
  );

  for (let i = 0; i < set.count; i += 1) mount(itemsEl, placeholders[i] = div`.sticker-set__item`());

  useObservable(container, stickerSetCache.indices.stickers.readySubject(setId), true, (isLoaded) => {
    if (!isLoaded) return;

    const stickers = stickerSetCache.indices.stickers.getStickers(setId);

    for (let i = 0; i < Math.min(stickers.length, set.count); i += 1) {
      mount(placeholders[i], stickerRenderer(stickers[i] as Document.document, { size: '70px', onClick }));
    }
  });


  return container;
}
