import { el, mount, unmount, listenOnce, listen } from 'core/dom';
import { BehaviorSubject } from 'rxjs';
import { useObservable, useListenWhileMounted, useOnMount } from 'core/hooks';
import './list.scss';
import { div } from 'core/html';

type Props = {
  tag?: keyof HTMLElementTagNameMap,
  className?: string,
  items: BehaviorSubject<readonly any[]>,
  threshold?: number,
  reversed?: boolean,
  padding?: number,
  batch?: number,
  renderer: (item: any) => HTMLElement,
  key?: (item: any) => string,
  onReachEnd?: () => void,
};

/**
 * Performance targeted scrollable container with flip animations
 *
 * @example
 * list({
 *  items: data,
 *  renderer: (data) => div`.css`(text(data))
 * })
 */
export default function list({ tag, className, threshold = 400, reversed = false,
  padding = 0,
  batch = 5,
  items,
  renderer,
  key = (i) => `${i}`,
  onReachEnd,
}: Props) {
  const container = el(tag || 'div', { className: 'list__container' });
  const elements: Record<string, HTMLElement> = {};
  let current: any[] = [];
  let pending: any[] = [];

  if (padding) {
    container.style.paddingTop = `${padding}px`;
    container.style.paddingBottom = `${padding}px`;
  }

  let viewport = container.getBoundingClientRect();
  let offset = 0;
  let last = -1;
  let first = -1;
  let locked = false;
  let bottomFreeSpace = false;

  const mountChild = (data: any, before?: any): Element => {
    const id = key(data);
    if (!elements[id]) elements[id] = renderer(data);
    mount(container, elements[id], before ? elements[key(before)] : undefined);

    return elements[id];
  };

  // Mount before node, not data
  const mountBeforeNode = (data: any, before?: Node) => {
    const id = key(data);
    if (!elements[id]) elements[id] = renderer(data);
    unmount(elements[id]);
    mount(container, elements[id], before);
  };

  const unMountChild = (data: any) => {
    const id = key(data);
    if (!elements[id]) elements[id] = renderer(data);
    unmount(elements[id]);
  };

  // Mount visible children
  const init = () => {
    current = items.value.slice(0);

    if (reversed === false) {
      let lastRect = { top: 0, height: 0 };

      while (last < current.length - 1 && viewport.height + threshold > lastRect.top - viewport.top + lastRect.height) {
        last += 1;
        const id = key(current[last]);
        // to do replace
        mountChild(current[last]);
        lastRect = elements[id].getBoundingClientRect();

        if (first === -1) first = 0;
      }

      const numb = Math.min(batch, current.length - last - 1);
      for (let i = 0; i < numb; i += 1) {
        last += 1;
        mountChild(current[last]);
      }

      if (last === current.length - 1) bottomFreeSpace = true;
    } else {
      last = items.value.length - 1;
      first = items.value.length;

      if (last === -1) return;

      let theight = 0;

      while (first > 1 && theight < threshold + viewport.height) {
        first -= 1;
        mountChild(current[first], current[first + 1]);
        theight += elements[current[first]].getBoundingClientRect().height;
      }

      const num = Math.min(batch, first);
      for (let i = 0; i < num; i += 1) {
        first -= 1;
        mountChild(current[first], current[first + 1]);
      }

      container.scrollTop = container.scrollHeight - viewport.height;
    }
  };

  // animation FLIP
  const flip = (next: any[]) => {
    if (current.length === 0 && next.length === 0) return;
    if (current.length === 0 && next.length > 0) {
      init();
      return;
    }

    const visible = current.slice(first, last + 1);

    let nextVisibleFirst;
    let nextVisibleLast;

    if (reversed === false) {
      nextVisibleFirst = first; // next.indexOf(visible[0]);
      nextVisibleLast = first + visible.length - 1;
      if (nextVisibleLast >= next.length) nextVisibleLast = next.length - 1;
      // nextVisibleFirst = Math.max(0, nextVisibleLast - visible.length + 1);
    } else {
      nextVisibleLast = next.length - (current.length - last - 1) - 1;
      if (nextVisibleLast < 0) nextVisibleLast = 0;
      nextVisibleFirst = nextVisibleLast - (last - first);
      if (nextVisibleFirst < 0) nextVisibleFirst = 0;
    }

    // No need to rerender
    if (nextVisibleFirst > -1 && next.slice(nextVisibleFirst, visible.length) === visible) {
      current = next;
      return;
    }

    locked = true;

    const nextVisible = [];

    const flipFrom: Record<string, ClientRect> = {};
    const flipTo: Record<string, ClientRect> = {};

    // Keep start position for flip
    for (let i = 0; i < visible.length; i += 1) {
      flipFrom[key(visible[i])] = elements[key(visible[i])].getBoundingClientRect();
    }

    let nextEl = container.firstChild;

    for (let i = nextVisibleFirst; i < next.length && (i <= nextVisibleLast || bottomFreeSpace); i += 1) {
      const ekey = key(next[i]);

      // add
      if (visible.indexOf(next[i]) === -1) {
        const element = mountChild(next[i]);

        element.classList.add('list__appeared');

        listenOnce(element, 'animationend', () => element.classList.remove('list__appeared'));

        if (bottomFreeSpace) {
          const elRect = element.getBoundingClientRect();
          nextVisibleLast += 1;
          if (viewport.height + threshold * 2 < elRect.top - viewport.top + elRect.height) bottomFreeSpace = false;
        }
      // swap
      } else if (elements[ekey] !== nextEl) {
        unMountChild(next[i]);
        mountBeforeNode(next[i], nextEl as Node);
      }

      // continue
      nextEl = elements[ekey].nextSibling;

      nextVisible.push(next[i]);
    }

    // remove
    for (let i = 0; i < visible.length; i += 1) {
      const element = elements[key(visible[i])];
      element.style.transformOrigin = '';
      element.classList.remove('list__flipping');

      if (nextVisible.indexOf(visible[i]) === -1) {
        // const pos = element.getBoundingClientRect();

        // element.style.transform = `translate(${flipFrom[key(visible[i])].left - pos.left}px, ${flipFrom[key(visible[i])].top - pos.top}px)`;
        // element.classList.add('list__removed');

        // listenOnce(element, 'animationend', () => {
        //   element.classList.remove('list__removed');
        //   element.style.transform = '';
        //   unmount(element);
        // });

        unmount(element);

        delete flipFrom[key(visible[i])];
      }
    }

    container.scrollTop = offset;

    // animate
    let animated = Object.keys(flipFrom);
    for (let i = 0; i < animated.length; i += 1) {
      const akey = animated[i];

      flipTo[akey] = elements[akey].getBoundingClientRect();

      const iTop = flipFrom[akey].top - flipTo[akey].top;
      const iLeft = flipFrom[akey].left - flipTo[akey].left;

      if (iTop === 0 && iLeft === 0) {
        delete flipFrom[akey];
        continue;
      } else {
        elements[akey].style.transformOrigin = 'top left';
        elements[akey].style.transform = `translate(${iLeft}px, ${iTop}px)`;
      }
    }

    animated = Object.keys(flipFrom);

    // Wait next frame
    requestAnimationFrame(() => {
      for (let i = 0; i < animated.length; i += 1) {
        const toBeFlipped = elements[animated[i]];

        toBeFlipped.classList.add('list__flipping');
        toBeFlipped.style.transform = '';

        listenOnce(toBeFlipped, 'transitionend', () => {
          toBeFlipped.style.transformOrigin = '';
          toBeFlipped.classList.remove('list__flipping');
        });
      }
    });

    current = next.slice(0);
    first = nextVisibleFirst;
    last = nextVisibleLast;

    locked = false;

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    if (reversed === false) scrollDown();
  };

  const lock = () => { locked = true; };
  const unlock = () => {
    locked = false;
    if (pending.length > 0) {
      flip(pending);
      pending = [];
    }
  };

  // Scroll Down
  const scrollDown = () => {
    if (current.length === 0) return;

    const lastRect = elements[key(current[last])].getBoundingClientRect();
    // Add elements from bottom
    if ((!locked && viewport.height + threshold > lastRect.top - viewport.top + lastRect.height)) {
      let prevScroll = container.scrollTop;
      const numb = Math.min(batch, current.length - last - 1);

      lock();

      let numd = 0;
      let removeHeight = 0;
      const spaceTop = container.scrollTop;

      while (removeHeight < spaceTop - threshold && numd < numb) {
        const { height } = elements[current[first + numd]].getBoundingClientRect();
        removeHeight += height;
        prevScroll -= height;
        numd += 1;
      }

      for (let i = 0; i < numb; i += 1) {
        last += 1;
        mountChild(current[last]);
      }

      for (let i = 0; i < Math.min(numb, numd); i += 1) {
        unMountChild(current[first]);
        first += 1;
      }

      offset = prevScroll;
      container.scrollTop = prevScroll;
      // offset = container.scrollTop;

      unlock();

      if (current.length - last - 1 <= batch && reversed === false && onReachEnd) onReachEnd();
    }
  };

  // Scroll Up
  const scrollUp = () => {
    if (current.length === 0) return;

    // Add elements from top
    if (!locked && offset < threshold) {
      let prevScroll = container.scrollTop;
      const prevFirst = first;
      const num = Math.min(batch, first);

      lock();

      let numd = 0;
      let removeHeight = 0;
      const spaceBottom = container.scrollHeight - (container.scrollTop + viewport.height);

      while (removeHeight < spaceBottom - threshold && numd < num) {
        removeHeight += elements[current[last - numd]].getBoundingClientRect().height;
        numd += 1;
      }

      for (let i = 0; i < num; i += 1) {
        first -= 1;
        mountChild(current[first], current[first + 1]);
      }

      for (let i = 0; i < Math.min(num, numd); i += 1) {
        unMountChild(current[last]);
        last -= 1;
      }

      for (let i = 0; i < num; i += 1) {
        prevScroll += elements[current[prevFirst - i - 1]].getBoundingClientRect().height;
      }

      offset = prevScroll;
      container.scrollTop = prevScroll;

      unlock();

      if (first <= batch && reversed === true && onReachEnd) onReachEnd();
    }
  };

  // On data changed
  useObservable(container, items, (next: any) => {
    // console.log('list update', next);
    if (locked) pending = next;
    else flip(next);
  });

  listen(container, 'scroll', () => {
    if (container.scrollTop < 0) return;
    if (container.scrollTop + viewport.height > container.scrollHeight - 5) return;
    if (container.scrollTop === offset || locked) return;

    if (container.scrollTop > offset) {
      offset = container.scrollTop;
      scrollDown();
    } else {
      offset = container.scrollTop;
      scrollUp();
    }
  }, { capture: true, passive: true });

  useOnMount(container, () => {
    viewport = container.getBoundingClientRect();
    init();
  });

  useListenWhileMounted(container, window, 'resize', () => {
    viewport = container.getBoundingClientRect();
  });

  return div`.list${className}${reversed ? 'reversed' : ''}`(container);
}
