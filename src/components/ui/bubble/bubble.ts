import { div } from 'core/html';
import { useInterface } from 'core/hooks';
import './bubble.scss';

export default function bubble(out: boolean, ...children: Node[]) {
  const shadow = div`.bubble__shadow`();
  const background = div`.bubble__background`();
  const content = div`.bubble__content`(...children);
  const element = div`.bubble`(shadow, background, content);

  if (out) {
    element.classList.add('out');
  }

  const updateBorders = (first: boolean, last: boolean) => {
    element.classList.toggle('first', first);
    element.classList.toggle('last', last);
    const hasPictureAtBottom = children[children.length - 1] instanceof HTMLImageElement;
    if (!hasPictureAtBottom || !last) {
      content.style.removeProperty('clip-path');
      content.style.overflow = 'hidden';
    } else {
      content.style.removeProperty('overflow');
      // content.style.clipPath = 'hidden';
    }
  };

  return useInterface(element, {
    updateBorders,
  });
}
