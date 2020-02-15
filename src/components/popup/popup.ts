import { div } from 'core/html';
import { main } from 'services';
import { useObservable, useInterface } from 'core/hooks';
import { unmount, mount } from 'core/dom';
import photoPopup from './photo/photo';
import SendMediaPopup from './send_media/send_media';
import stickerSetPopup from './sticker_set/sticker_set';
import './popup.scss';

/**
 * Generic handler for popups
 */
export default function popup() {
  const wrapper = div`.opaco`();
  let element: HTMLElement | undefined;

  useObservable(wrapper, main.popup, (type: string) => {
    if (element) unmount(element);
    if (wrapper.classList.contains('closing')) wrapper.classList.remove('closing');

    switch (type) {
      case '':
        wrapper.classList.remove('opened');
        break;

      case 'photo':
        wrapper.classList.add('opened');
        mount(wrapper, element = photoPopup(main.popupCtx));
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
