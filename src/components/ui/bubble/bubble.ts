/* eslint-disable no-param-reassign */
/* eslint-disable prefer-template */
import { div } from 'core/html';
import './bubble.scss';

interface Props {
  className?: string,
  out?: boolean;
  masked?: boolean;
  media?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  setRef?: (el: HTMLDivElement) => void,
}

export function bubbleClassName(className: string, out: boolean, media: boolean, first: boolean, last: boolean) {
  if (className) return className;

  return (
    'bubble'
  + (media ? '-media' : '')
  + (out ? '-out' : '')
  + (first ? '-first' : '')
  + (last ? '-last' : '')
  );
}

export default function bubble({
  className = '',
  out = false,
  media = false,
  isFirst = false,
  isLast = false,
  setRef,
}: Props, ...children: Node[]) {
  const content = div`.bubble__content`(...children);

  if (setRef) setRef(content);

  return (
    div({ className: bubbleClassName(className, out, media, isFirst, isLast) },
      div`.bubble__background`(),
      content,
    )
  );
}
