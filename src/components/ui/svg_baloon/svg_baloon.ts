import { el, mount } from 'core/dom';
import { svgCodeToComponent } from 'core/factory';
import './svg_baloon.scss';

function roundCornersSvg(r1: number, r2: number, r3: number, r4: number, w: number, h: number, tail: boolean, incoming: boolean) {
  let path: string;
  if (!tail) {
    // eslint-disable-next-line max-len
    path = `<path d="M ${r1} 0 a ${r1} ${r1} 0 0 0 -${r1} ${r1} v ${h - r1 - r2} a ${r2} ${r2} 0 0 0 ${r2} ${r2} h ${w - r2 - r3} a ${r3} ${r3} 0 0 0 ${r3} -${r3} v -${h - r3 - r4} a ${r4} ${r4} 0 0 0 -${r4} -${r4} z" />`;
  } else {
    const mirror = incoming ? `transform="scale(-1 1) translate(${-w} 0)"` : '';
    // eslint-disable-next-line max-len
    path = `<path d="M ${r1} 0 a ${r1} ${r1} 0 0 0 -${r1} ${r1} v ${h - r1 - r2} a ${r2} ${r2} 0 0 0 ${r2} ${r2} h ${w - r2 - 7}  h 6 c 0.281 0 0.548 -0.118 0.737 -0.325 c 0.373 -0.407 0.345 -1.04 -0.062 -1.413 q -3.269 -2.994 -4.626 -6.48 c -1.173 -3.016 -1.857 -5.943 -2.05 -8.782 v ${r4 - (h - 17)}  a ${r4} ${r4} 0 0 0 -${r4} -${r4} z" ${mirror} />`;
  }

  const id = `clip${Math.random()}`;
  // eslint-disable-next-line max-len
  const svg = `<svg width="0" height="0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="${id}">${path}</clipPath></defs></svg>`;
  return { id, svg };
}

type Props = {
  tag?: keyof HTMLElementTagNameMap,
  className?: string,
  width: number,
  height: number,
  tail: boolean,
  incoming: boolean,
};

export default function svgBaloon({ tag = 'div', className = '', ...props }: Props, children: Node[] = []) {
  const container = el(tag || 'div', { className: className || 'svgBaloon' });

  const { id, svg } = roundCornersSvg(12.5, 12.5, 12.5, 12.5, props.width, props.height, props.tail, props.incoming);
  const clipMask = svgCodeToComponent(svg);
  container.classList.toggle('tail', props.tail);
  container.classList.toggle('incoming', props.incoming);
  mount(container, clipMask());
  children.forEach((child) => mount(container, child));

  container.style.clipPath = `url(#${id})`;
  (container.style as any).webkitClipPath = `url(#${id})`;

  return container;
}
