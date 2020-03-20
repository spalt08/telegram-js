import { div } from 'core/html';
import { useInterface, WithInterfaceHook } from 'core/hooks';
import './bubble.scss';

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

  const element = div`.bubble${className}${masked ? '-masked' : ''}`(...layers);

  if (out) {
    element.classList.add('-out');
  }

  const updateBorders = (first: boolean, last: boolean) => {
    element.classList.toggle('-first', first);
    element.classList.toggle('-last', last);
  };

  return useInterface(element, {
    updateBorders,
  });
}

export type BubbleInterface = ReturnType<typeof bubble> extends WithInterfaceHook<infer I> ? I : never;
