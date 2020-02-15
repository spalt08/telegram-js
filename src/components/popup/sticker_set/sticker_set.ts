import { div, text } from 'core/html';
import { materialSpinner } from 'components/icons';
import { InputStickerSet } from 'cache/types';
import { listen, unmount, mount } from 'core/dom';
import { getInterface } from 'core/hooks';
import client from 'client/client';
import stickerSetFetched from 'components/media/sticker/set_fetched';
import popupCommon from '../popup_common';
import './sticker_set.scss';

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

  client.call('messages.getStickerSet', { stickerset }, (err, result) => {
    if (err || !result) throw new Error(`Unable to load sticker set: ${JSON.stringify(err)}`);

    unmount(loader);
    mount(content, stickerSetFetched(result.set, result.documents));
  });
  return container;
}