import { mount, unmount } from 'core/dom';
import { useInterface, useObservable } from 'core/hooks';
import { div } from 'core/html';
import { main } from 'services';
import { confirmationPopup, alertPopup } from './confirmation/confirmation';
import photoPopup from './photo/photo';
import './popup.scss';
import SendMediaPopup from './send_media/send_media';
import stickerSetPopup from './sticker_set/sticker_set';
import videoPopup from './video/video';
import { gallery } from './gallery/gallery';

/**
 * Generic handler for popups
 */
export default function popup() {
  const wrapper = div`.opaco`();
  let element: Node | undefined;

  useObservable(wrapper, main.popup, true, (type: string) => {
    if (element) unmount(element);
    wrapper.classList.remove('closing');

    switch (type) {
      case '':
        wrapper.classList.remove('opened');
        break;

      case 'photo':
        wrapper.classList.add('opened');
        mount(wrapper, element = photoPopup(main.popupCtx));
        break;

      case 'video':
        wrapper.classList.add('opened');
        mount(wrapper, element = videoPopup(main.popupCtx));
        break;

      case 'sendMedia': {
        const sendMedia = new SendMediaPopup();
        wrapper.classList.add('opened');
        mount(wrapper, element = sendMedia.container);
        break;
      }

      case 'stickerSet':
        wrapper.classList.add('opened');
        mount(wrapper, element = stickerSetPopup(main.popupCtx));
        break;

      case 'confirmation':
        wrapper.classList.add('opened');
        mount(wrapper, element = confirmationPopup(main.popupCtx));
        break;

      case 'alert':
        wrapper.classList.add('opened');
        mount(wrapper, element = alertPopup(main.popupCtx));
        break;

      case 'gallery':
        wrapper.classList.add('opened');
        mount(wrapper, element = gallery(main.popupCtx));
        break;

      default:
        throw new Error('Unknown popup');
    }
  });

  return useInterface(wrapper, {
    fade() {
      wrapper.classList.add('closing');
    },

    close() {
      wrapper.classList.remove('opened');
      wrapper.classList.remove('closing');
      if (element) unmount(element);
    },
  });
}
