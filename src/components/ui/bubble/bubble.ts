import { div } from 'core/html';
import { useInterface, useOnMount } from 'core/hooks';
import './bubble.scss';
import { svgCodeToComponent } from 'core/factory';
import { mount, unmount } from 'core/dom';

function roundCornersSvg(r1: number, r2: number, r3: number, w: number, h: number, out: boolean) {
  const mirror = out ? '' : `transform="scale(-1 1) translate(${-w} 0)"`;
  // eslint-disable-next-line max-len
  const path = `<path d="M ${r1} 0 a ${r1} ${r1} 0 0 0 -${r1} ${r1} v ${h - r1 - r2} a ${r2} ${r2} 0 0 0 ${r2} ${r2} h ${w - r2}  h 6 c 0.281 0 0.548 -0.118 0.737 -0.325 c 0.373 -0.407 0.345 -1.04 -0.062 -1.413 q -3.269 -2.994 -4.626 -6.48 c -1.173 -3.016 -1.857 -5.943 -2.05 -8.782 v ${r3 - (h - 17)}  a ${r3} ${r3} 0 0 0 -${r3} -${r3} z" ${mirror} />`;

  const id = `clip${Math.random()}`;
  // eslint-disable-next-line max-len
  const svg = `<svg width="0" height="0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="${id}">${path}</clipPath></defs></svg>`;
  return { id, svg };
}

export type BubbleInterface = {
  updateBorders: (first: boolean, last: boolean) => void;
};

export default function bubble(out: boolean, tailClip: boolean, onlyMedia: boolean, ...children: Node[]) {
  const shadow = div`.bubble__shadow`();
  const background = div`.bubble__background`();
  const content = div`.bubble__content`(...children);
  const element = div`.bubble`(shadow, background, content);

  if (onlyMedia) {
    unmount(background);
  }

  if (out) {
    element.classList.add('out');
  }

  let clipPath: SVGElement | undefined;

  const updateBorders = (first: boolean, last: boolean) => {
    element.classList.toggle('first', first);
    element.classList.toggle('last', last);
    if (!tailClip || !last) {
      content.style.removeProperty('clip-path');
      content.style.overflow = 'hidden';
    } else {
      content.style.removeProperty('overflow');
      useOnMount(content, () => {
        const { id, svg } = roundCornersSvg(12, 12, first ? 12 : 6, content.clientWidth, content.clientHeight, out);
        if (clipPath) {
          unmount(clipPath);
        }
        const clipMask = svgCodeToComponent(svg);
        clipPath = clipMask();
        mount(content, clipPath);
        content.style.clipPath = `url(#${id})`;
      });
    }
  };

  return useInterface(element, {
    updateBorders,
  });
}
