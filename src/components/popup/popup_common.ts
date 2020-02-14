import { div } from 'core/html';
import { useListenWhileMounted, hasInterface, getInterface, useInterface } from 'core/hooks';
import { main } from 'services';
import { listenOnce } from 'core/dom';
import { KeyboardKeys } from 'const';
import { PopupInterface } from './interface';

/**
 * Common wrapper for popup with click outside to close
 */
export default function popupCommon(...children: Node[]) {
  const element = div`.popup.default.animated`(...children);

  const remove = () => {
    if (hasInterface<PopupInterface>(element.parentElement)) {
      getInterface(element.parentElement).fade();
      element.classList.add('removing');

      listenOnce(element, 'animationend', main.closePopup);
    }
  };

  useListenWhileMounted(element, window, 'keyup', (event: KeyboardEvent) => {
    if (event.keyCode === KeyboardKeys.ESC) {
      remove();
    }
  });

  useListenWhileMounted(element, window, 'click', (event: MouseEvent) => {
    const rect = element.getBoundingClientRect();

    if (event.pageX < rect.left || event.pageX > rect.left + rect.width || event.pageY < rect.top || event.pageY > rect.top + rect.height) {
      remove();
    }
  });

  return useInterface(element, {
    remove,
  });
}
