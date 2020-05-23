import { div } from 'core/html';
import { useInterface } from 'core/hooks';
import './bubble.scss';

interface Props {
  className?: string,
  out?: boolean;
  masked?: boolean;
  media?: boolean;
}

export default function bubble({
  className = '',
  out = false,
  media = false,
}: Props, ...children: Node[]) {
  const element = div`.bubble2${className}`(
    div`.bubble2__background`(),
    div`.bubble2__content`(...children),
  );

  if (out) element.classList.add('-out');
  if (media) element.classList.add('-media');

  return useInterface(element, {
    updateBorders: (first: boolean, last: boolean) => {
      element.classList.toggle('-first', first);
      element.classList.toggle('-last', last);
    },
  });
}
