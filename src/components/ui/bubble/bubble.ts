import { div } from 'core/html';
import { useInterface } from 'core/hooks';
import './bubble.scss';
import { unmount } from 'core/dom';

// Chrome and Safari on MacOS scale up png masks, while Windows browsers do not.
// At the same time, Windows browsers scale down svg masks, while MacOS browsers don't.
// Thus, we use png masks for Windows and svg masks for MacOS.
const isMac = navigator.platform.indexOf('Mac') >= 0;

export type BubbleInterface = {
  updateBorders: (first: boolean, last: boolean) => void;
};

export default function bubble(out: boolean, masked: boolean, onlyMedia: boolean, ...children: Node[]) {
  const shadow = div`.bubble__shadow`();
  const background = div`.bubble__background`();
  const content = div`.bubble__content`(...children);
  const element = div`.bubble${masked ? 'masked' : ''}${isMac ? 'svg' : ''}`(shadow, background, content);

  if (onlyMedia) {
    unmount(background);
  }

  if (out) {
    element.classList.add('out');
  }

  const updateBorders = (first: boolean, last: boolean) => {
    element.classList.toggle('first', first);
    element.classList.toggle('last', last);
  };

  return useInterface(element, {
    updateBorders,
  });
}
