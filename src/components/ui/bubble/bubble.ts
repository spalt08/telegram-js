/* eslint-disable no-param-reassign */
/* eslint-disable prefer-template */
import { div } from 'core/html';
import { preloadImage } from 'helpers/other';
import bubble_in_central_src from './images/bubble_in-central.png';
import bubble_in_first_last_src from './images/bubble_in-first-last.png';
import bubble_in_first_src from './images/bubble_in-first.png';
import bubble_in_last_src from './images/bubble_in-last.png';
import bubble_out_central_src from './images/bubble_out-central.png';
import bubble_out_first_last_src from './images/bubble_out-first-last.png';
import bubble_out_last_src from './images/bubble_out-last.png';
import bubble_out_first_src from './images/bubble_out-first.png';
import mask_in_first_src from './images/mask_in-first.png';
import mask_in_first_last_src from './images/mask_in-first-last.png';
import mask_in_central_src from './images/mask_in-central.png';
import mask_in_last_src from './images/mask_in-last.png';
import mask_out_first_last_src from './images/mask_out-first-last.png';
import mask_out_last_src from './images/mask_out-last.png';
import mask_out_first_src from './images/mask_out-first.png';
import mask_out_central_src from './images/mask_out-central.png';
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

export function preloadResources() {
  preloadImage(bubble_in_last_src);
  preloadImage(bubble_in_central_src);
  preloadImage(bubble_in_first_last_src);
  preloadImage(bubble_in_first_src);
  preloadImage(bubble_out_central_src);
  preloadImage(bubble_out_first_last_src);
  preloadImage(bubble_out_last_src);
  preloadImage(bubble_out_first_src);
  preloadImage(mask_in_first_src);
  preloadImage(mask_in_first_last_src);
  preloadImage(mask_in_central_src);
  preloadImage(mask_in_last_src);
  preloadImage(mask_out_first_last_src);
  preloadImage(mask_out_last_src);
  preloadImage(mask_out_first_src);
  preloadImage(mask_out_central_src);
}
