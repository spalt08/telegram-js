import { el, mount, unmount, listenOnce } from 'core/dom';
import { Observable } from 'rxjs';
import { useObservable } from 'core/hooks';
import './list.scss';

type Props = {
  tag?: keyof HTMLElementTagNameMap,
  className?: string,
  items: Observable<any[]>,
  renderer: (item: any) => HTMLElement,
  key?: (item: any) => string,
};

export default function list({ tag, className, items, renderer, key = (i) => `${i}` }: Props) {
  const container = el(tag || 'div', { className });

  const rendered: Record<string, HTMLElement> = {};

  useObservable(container, items, (next: any[]) => {
    const flipFrom: Record<string, ClientRect> = {};
    const flipTo: Record<string, ClientRect> = {};

    const mounted = Object.keys(rendered);
    const nextKeys = [];
    let nextEl = container.firstChild;

    for (let i = 0; i < mounted.length; i += 1) {
      flipFrom[mounted[i]] = rendered[mounted[i]].getBoundingClientRect();
    }

    for (let i = 0; i < next.length; i += 1) {
      const ekey = key(next[i]);

      // add
      if (!rendered[ekey]) {
        const element = renderer(next[i]);
        mount(container, element, nextEl as Node);

        rendered[ekey] = element;
        element.classList.add('list__appeared');

        listenOnce(element, 'animationend', () => element.classList.remove('list__appeared'));
      // swap
      } else if (rendered[ekey] !== nextEl) {
        unmount(rendered[ekey]);
        mount(container, rendered[ekey], nextEl as Node);
      }

      // continue
      nextEl = rendered[ekey].nextSibling;

      nextKeys.push(ekey);
    }

    // remove
    for (let i = 0; i < mounted.length; i += 1) {
      rendered[mounted[i]].style.transformOrigin = '';
      rendered[mounted[i]].classList.remove('list__flipping');

      if (nextKeys.indexOf(mounted[i]) === -1) {
        const toBeRemoved = rendered[mounted[i]];
        toBeRemoved.classList.add('list__removed');

        listenOnce(toBeRemoved, 'animationend', () => unmount(toBeRemoved));

        delete rendered[mounted[i]];
        delete flipFrom[mounted[i]];
      }
    }

    // animate
    let animated = Object.keys(flipFrom);
    for (let i = 0; i < animated.length; i += 1) {
      const akey = animated[i];

      flipTo[akey] = rendered[animated[i]].getBoundingClientRect();

      const iTop = flipFrom[akey].top - flipTo[akey].top;
      const iLeft = flipFrom[akey].left - flipTo[akey].left;

      if (iTop === 0 && iLeft === 0) {
        delete flipFrom[akey];
        continue;
      }

      rendered[akey].style.transformOrigin = 'top left';
      rendered[akey].style.transform = `translate(${iLeft}px, ${iTop}px)`;
    }

    animated = Object.keys(flipFrom);

    // Wait next frame
    requestAnimationFrame(() => {
      for (let i = 0; i < animated.length; i += 1) {
        const toBeFlipped = rendered[animated[i]];

        toBeFlipped.classList.add('list__flipping');
        toBeFlipped.style.transform = '';

        listenOnce(toBeFlipped, 'transitionend', () => {
          toBeFlipped.style.transformOrigin = '';
          toBeFlipped.classList.remove('list__flipping');
        });
      }
    });
  });

  return container;
}
