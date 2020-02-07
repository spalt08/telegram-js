import { div } from 'core/html';
import { main } from 'services';
import { useObservable, useInterface } from 'core/hooks';
import { unmount, mount } from 'core/dom';
import photo from './photo/photo';
import './popup.scss';

/**
 * Generic handler for popups
 */
export default function popup() {
  const wrapper = div`.opaco`();
  let element: HTMLElement | undefined;

  useObservable(wrapper, main.popup, (type: string) => {
    if (element) unmount(element);

    switch (type) {
      case '':
        wrapper.classList.remove('opened');
        break;

      case 'photo':
        wrapper.classList.add('opened');
        mount(wrapper, element = photo(main.popupCtx));
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
    },
  });
}
