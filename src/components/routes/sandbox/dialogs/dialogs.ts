import { mount, unmount, listenOnce } from 'core/dom';
import { BehaviorSubject } from 'rxjs';
import { useObservable } from 'core/hooks';
import { div, text } from 'core/html';
import './dialogs.scss';

export default function dialogs(list: BehaviorSubject<string[]>) {
  const dialog = (item: string) => div`.test`(text(item));
  const elHeight = 21;

  const container = div`.dialogs`();
  const elements: Record<string, HTMLElement> = {};
  let prev: string[] = [];

  useObservable(container, list, (next: string[]) => {
    let iterEl = container.firstChild;

    for (let i = 0; i < next.length; i += 1) {
      const id = next[i];

      // add
      if (!elements[id]) {
        const element = dialog(id);
        element.classList.add('dialog__appeared');
        elements[id] = element;

        mount(container, element, iterEl as Node);

        listenOnce(element, 'animationend', () => element.classList.remove('dialog__appeared'));
      // swap
      } else if (elements[id] !== iterEl) {
        unmount(elements[id]);
        mount(container, elements[id], iterEl as Node);
      }

      // continue
      iterEl = elements[id].nextSibling;
    }

    // remove
    for (let i = 0; i < prev.length; i += 1) {
      const id = prev[i];

      elements[id].style.transformOrigin = '';
      elements[id].classList.remove('dialog__flipping');

      if (next.indexOf(id) === -1) {
        const toBeRemoved = elements[id];
        const dy = (i - next.length) * elHeight;

        toBeRemoved.style.transform = `translateY(${dy}px)`;
        toBeRemoved.classList.add('dialog__removed');

        listenOnce(toBeRemoved, 'animationend', () => unmount(toBeRemoved));

        delete elements[id];
      }
    }

    const animated: string[] = [];

    // animate;
    for (let nextPos = 0; nextPos < next.length; nextPos += 1) {
      const id = next[nextPos];
      const prevPos = prev.indexOf(id);

      elements[id].getBoundingClientRect();
      elements[id].getBoundingClientRect();

      if (prevPos > -1) {
        const dy = (prevPos - nextPos) * elHeight;

        if (dy !== 0) {
          elements[id].classList.remove('dialog__flipping');
          elements[id].style.transformOrigin = 'top left';
          elements[id].style.transform = `translate(0, ${dy}px)`;
          animated.push(id);
        }
      }
    }

    prev = next.slice(0);

    requestAnimationFrame(() => {
      for (let i = 0; i < animated.length; i += 1) {
        const id = animated[i];
        const toBeFlipped = elements[id];

        elements[id].classList.add('dialog__flipping');
        elements[id].style.transform = '';

        listenOnce(toBeFlipped, 'transitionend', () => {
          toBeFlipped.style.transformOrigin = '';
          toBeFlipped.classList.remove('dialog__flipping');
        });
      }
    });
  });

  return container;
}
