import { Document } from 'mtproto-js';
import { text, div, button } from 'core/html';
import { media } from 'services';
import { pluralize } from 'helpers/other';
import './set_covered.scss';
import { stickerSetCache } from 'cache';
import { listen, mount } from 'core/dom';
import { useOnMount, useObservable } from 'core/hooks';
import stickerRenderer from './sticker';

/**
 * Covered Sticker
 */
const savedIndex = stickerSetCache.indices.saved;
const stickerIndex = stickerSetCache.indices.stickers;
const MAX_STICKERS = 5;

export default function stickerSetCovered(setId: string) {
  const covered = media.foundStickersMap.get(setId);
  if (!covered) return div();

  const { set } = covered;

  let stickers;
  if (covered._ === 'stickerSetCovered') stickers = [covered.cover as Document.document];
  else stickers = covered.covers as Document.document[];

  const placeholders: HTMLElement[] = new Array(MAX_STICKERS);

  for (let i = 0; i < MAX_STICKERS; i++) placeholders[i] = div`.st-set-covered__item`();
  for (let i = 0; i < stickers.length && i < MAX_STICKERS; i++) {
    mount(placeholders[i], stickerRenderer(stickers[i], { size: '70px', playOnHover: true, autoplay: false }));
  }

  const addBtn = button`.st-set-covered__addbtn`();

  useOnMount(addBtn, () => {
    if (savedIndex.getIds().indexOf(set.id) > -1) {
      addBtn.textContent = 'Added';
      addBtn.classList.add('-disabled');
    } else {
      addBtn.textContent = 'Add';
    }
  });

  listen(addBtn, 'click', () => {
    if (savedIndex.getIds().indexOf(set.id) > -1) {
      media.removeStickerSet(set);
      addBtn.textContent = 'Add';
      addBtn.classList.remove('-disabled');
    } else {
      media.addStickerSet(set);
      addBtn.textContent = 'Added';
      addBtn.classList.add('-disabled');
    }
  });

  const container = (
    div`.st-set-covered`(
      div`.st-set-covered__heading`(
        div`.st-set-covered__info`(
          div`.st-set-covered__title`(text(set.title)),
          div`.st-set-covered__subtitle`(text(`${set.count} ${pluralize(set.count, 'sticker', 'stickers')}`)),
        ),
        addBtn,
      ),
      div`.st-set-covered__items`(
        ...placeholders,
      ),
    )
  );


  if (stickers.length < MAX_STICKERS) {
    const offset = stickers.length;

    useObservable(container, stickerIndex.readySubject(setId), true, (isReady) => {
      if (!isReady) return;

      const setStickers = stickerIndex.getStickers(setId);

      for (let i = offset; i < MAX_STICKERS; i++) {
        const sticker = setStickers[i];
        if (sticker) mount(placeholders[i], stickerRenderer(sticker, { size: '70px', playOnHover: true, autoplay: false }));
      }
    });

    useOnMount(container, () => media.loadStickerSet(setId));
  }

  return container;
}
