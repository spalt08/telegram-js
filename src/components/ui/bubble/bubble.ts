import { div } from 'core/html';
import { useInterface } from 'core/hooks';
import './bubble.scss';
import { unmount } from 'core/dom';

export type BubbleInterface = {
  updateBorders: (first: boolean, last: boolean) => void;
};

export default function bubble(out: boolean, masked: boolean, onlyMedia: boolean, ...children: Node[]) {
  const shadow = div`.bubble__shadow`();
  const background = div`.bubble__background`();
  const content = div`.bubble__content`(...children);
  const element = div`.bubble${masked ? 'masked' : ''}`(shadow, background, content);

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
