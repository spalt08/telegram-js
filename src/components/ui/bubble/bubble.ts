import { div } from 'core/html';
import { useInterface } from 'core/hooks';
import './bubble.scss';

// Chrome and Safari on MacOS scale up png masks, while Windows browsers do not.
// At the same time, Windows browsers scale down svg masks, while MacOS browsers don't.
// Thus, we use png masks for Windows and svg masks for MacOS.
const isMac = navigator.platform.indexOf('Mac') >= 0;

export type BubbleInterface = {
  updateBorders: (first: boolean, last: boolean) => void;
};

interface Props {
  className?: string,
  out?: boolean;
  masked?: boolean;
  onlyMedia?: boolean;
}

export default function bubble({
  className = '',
  out = false,
  masked = false,
  onlyMedia = false,
}: Props, ...children: Node[]) {
  const shadow = div`.bubble__shadow`();
  const background = div`.bubble__background`();
  const content = div`.bubble__content`(...children);

  const layers = onlyMedia ? [shadow, content] : [shadow, background, content];

  const element = div`.bubble${className}${masked ? 'masked' : ''}${isMac ? 'svg' : ''}`(...layers);

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
