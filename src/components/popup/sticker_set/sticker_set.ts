import { div, text } from 'core/html';
import { materialSpinner } from 'components/icons';
import { Document, InputStickerSet } from 'mtproto-js';
import { listen, unmount, mount } from 'core/dom';
import { getInterface } from 'core/hooks';
import client from 'client/client';
import stickerSetFetched from 'components/media/sticker/set_fetched';
import { pluralize } from 'helpers/other';
import popupCommon from '../popup_common';
import './sticker_set.scss';
import { stickerSetCache } from 'cache';
import { media } from 'services';

export default function stickerSetPopup(stickerset: InputStickerSet) {
  const loader = materialSpinner({ className: 'popup-sticker-set__loading' });
  const close = div`.popup__close`();
  const content = div`.popup__content.popup-sticker-set`(loader);
  const container = popupCommon(
    div`.popup__header`(
      div`.popup__title`(text('Sticker Set')),
      close,
    ),
    content,
  );

  listen(close, 'click', getInterface(container).remove);


  client.call('messages.getStickerSet', { stickerset })
    .then((result) => {
      unmount(loader);
      mount(content, stickerSetFetched(result.set, result.documents as Document.document[]));

      const addBtn = div`.popup-sticker-set__add`();

      if (stickerSetCache.indices.saved.getIds().indexOf(result.set.id) > -1) {
        addBtn.textContent = `Remove ${result.set.count} ${pluralize(result.set.count, 'Sticker', 'Stickers')}`;
      } else {
        addBtn.textContent = `Add ${result.set.count} ${pluralize(result.set.count, 'Sticker', 'Stickers')}`;
      }

      listen(addBtn, 'click', () => {
        if (stickerSetCache.indices.saved.getIds().indexOf(result.set.id) > -1) {
          media.removeStickerSet(result.set);
          addBtn.textContent = `Add ${result.set.count} ${pluralize(result.set.count, 'Sticker', 'Stickers')}`;
        } else {
          stickerSetCache.put(result.set);
          media.addStickerSet(result.set);
          addBtn.textContent = `Remove ${result.set.count} ${pluralize(result.set.count, 'Sticker', 'Stickers')}`;
        }
      });

      mount(container, div`.popup-sticker-set__bottom`(addBtn));
    })
    .catch((err) => {
      throw new Error(`Unable to load sticker set: ${JSON.stringify(err)}`);
    });


  return container;
}
