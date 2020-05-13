import { div } from 'core/html';
import { useInterface } from 'core/hooks';
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
  const element = div`.bubble2${className}`(
    div`.bubble2__background`(),
    ...children,
  );

  if (out) element.classList.add('-out');
  if (masked) element.classList.add('-masked');

  return useInterface(element, {
    updateBorders: (first: boolean, last: boolean) => {
      element.classList.toggle('-first', first);
      element.classList.toggle('-last', last);
    },
  });
}
