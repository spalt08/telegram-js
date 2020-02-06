import { el, mount, unmount, listen, listenOnce } from 'core/dom';
import { div } from 'core/html';
import { BehaviorSubject } from 'rxjs';
import './list.scss';
import { useObservable, useInterface, useOnMount, useListenWhileMounted } from 'core/hooks';

type Props<T> = {
  tag?: keyof HTMLElementTagNameMap,
  className?: string,
  items: BehaviorSubject<readonly T[]>,
  threshold?: number,
  pivotBottom?: boolean,
  padding?: number,
  batch?: number,
  renderer: (item: T) => HTMLElement,
  key?: (item: T) => string,
  onReachTop?: () => void,
  onReachBottom?: () => void,
};

const ease = (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

/**
 * Scrollable container with flip animations
 *
 * @example
 * list({
 *  items: data,
 *  renderer: (data) => div`.css`(text(data))
 * })
 */
export default function list<T>({ tag, className,
  pivotBottom = false,
  padding = 0,
  batch = 20,
  threshold = 2,
  items,
  renderer,
  key = (i) => `${i}`,
  onReachTop,
  onReachBottom,
}: Props<T>) {
  const container = el(tag || 'div', { className: 'list__container' });
  const wrapper = div`.list${className}${pivotBottom ? 'reversed' : ''}`(container);

  // handle padding
  if (padding) {
    container.style.paddingTop = `${padding}px`;
    container.style.paddingBottom = `${padding}px`;
  }

  // storage for rendered items
  let elements: Record<string, {
    el: HTMLElement,
    rect?: DOMRect,
  }> = {};

  // cached items
  let current: readonly T[] = [];
  let first = -1;
  let last = -2;
  let offset: number = -1;
  let pending: readonly T[] = [];
  let focused: T | undefined;
  let isLocked = false;
  let viewport = wrapper.getBoundingClientRect();

  // item -> HTMLElement
  const element = (data: T): HTMLElement => {
    const id = key(data);
    if (!elements[id]) {
      elements[id] = { el: renderer(data) };
      // todo: catch element layout update
    }

    return elements[id].el;
  };

  // mount or unmount item
  const mountChild = (item: T, before?: T) => mount(container, element(item), before ? element(before) : undefined);
  const unMountChild = (item: T) => unmount(element(item));

  // mount before node, not data
  const mountBeforeNode = (item: T, before?: Node) => {
    const elm = element(item);
    unmount(elm);
    mount(container, elm, before);
  };


  // update content with flip animations
  const update = (next: readonly T[]) => {
    const focusedIndex = focused ? next.indexOf(focused) : -1;

    // fallback if no changes
    if (focusedIndex === -1 && current === next && !focused) return;

    // pass if nothing is rendered
    if (focusedIndex === -1 && (current.length === 0 || last < first)) {
      current = next.slice(0);
      return;
    }

    isLocked = true;

    // visible elements
    const visible = first > -1 && last > -1 ? current.slice(first, last + 1) : [];

    // visible indexes after update
    let nextFirst;
    let nextLast;

    // animation class
    const animationClass = focusedIndex === -1 || current.length === 0 ? 'list__appeared' : 'list__scrolled';

    // if has focused element
    if (focusedIndex !== -1) {
      nextFirst = Math.max(0, focusedIndex - batch);
      nextLast = Math.min(focusedIndex + batch, next.length - 1);

    // keep first element visible
    } else if (pivotBottom === false) {
      nextFirst = first;
      nextLast = Math.min(first + visible.length - 1, next.length - 1);

    // keep last element visible
    } else {
      nextLast = Math.max(0, next.length - (current.length - last - 1) - 1);
      nextFirst = Math.max(nextLast - (last - first), 0);
    }

    // no need to rerender
    if (nextFirst > -1 && next.slice(nextFirst, visible.length) === visible) {
      current = next;
      return;
    }

    isLocked = true;

    const nextVisible = [];
    const flipFrom: Record<string, ClientRect> = {};
    const flipTo: Record<string, ClientRect> = {};

    // keep start position for flip
    for (let i = 0; i < visible.length; i += 1) {
      flipFrom[key(visible[i])] = element(visible[i]).getBoundingClientRect();
    }

    // iterate through elements and update it's position
    let nextEl = container.firstChild;
    for (let i = nextFirst; i <= nextLast; i += 1) {
      const elm = element(next[i]);
      // add new element
      if (visible.indexOf(next[i]) === -1) {
        mountChild(next[i]);

        elm.classList.add(animationClass);
        listenOnce(elm, 'animationend', () => elm.classList.remove(animationClass));

      // swap elements
      } else if (element(next[i]) !== nextEl) {
        unMountChild(next[i]);
        mountBeforeNode(next[i], nextEl as Node);
      }

      // continue
      nextEl = elm.nextSibling;

      // update next visible shortcut
      nextVisible.push(next[i]);
    }

    // remove old elements
    for (let i = 0; i < visible.length; i += 1) {
      const elm = element(visible[i]);

      elm.style.transformOrigin = '';
      elm.classList.remove('list__flipping');

      if (nextVisible.indexOf(visible[i]) === -1) {
        unmount(elm);
        delete flipFrom[key(visible[i])];
      }
    }

    // keep position
    if (focusedIndex === -1) {
      container.scrollTop = offset;

    // change position
    } else {
      const rect = element(focused!).getBoundingClientRect();
      const rectTopOffset = container.scrollTop + rect.top - viewport.top;

      let scrollValue = rectTopOffset;
      if (viewport.height > rect.height) scrollValue -= (viewport.height - rect.height) / 2;
      else scrollValue -= 50;

      console.log(container.scrollTop, rect.top, viewport.top, 'rectTopOffset', rectTopOffset);

      element(focused!).classList.add('focused');
      container.scrollTop = offset = scrollValue; // eslint-disable-line
    }

    // animatet if not focused
    if (focusedIndex === -1) {
      // animate elements
      let animated = Object.keys(flipFrom);
      for (let i = 0; i < animated.length; i += 1) {
        const akey = animated[i];

        flipTo[akey] = elements[akey].el.getBoundingClientRect();

        const iTop = flipFrom[akey].top - flipTo[akey].top;
        const iLeft = flipFrom[akey].left - flipTo[akey].left;

        if (iTop === 0 && iLeft === 0) {
          delete flipFrom[akey];
          continue;
        } else {
          elements[akey].el.style.transformOrigin = 'top left';
          elements[akey].el.style.transform = `translate(${iLeft}px, ${iTop}px)`;
        }
      }

      // get final list of els to animate
      animated = Object.keys(flipFrom);

      // Wait next frame
      requestAnimationFrame(() => {
        for (let i = 0; i < animated.length; i += 1) {
          const toBeFlipped = elements[animated[i]].el;

          toBeFlipped.classList.add('list__flipping');
          toBeFlipped.style.transform = '';

          listenOnce(toBeFlipped, 'transitionend', () => {
            toBeFlipped.style.transformOrigin = '';
            toBeFlipped.classList.remove('list__flipping');
          });
        }
      });
    }

    if (focused) {
      element(focused).classList.remove('focused');
      focused = undefined;
    }
    current = next.slice(0);
    console.log('was', first, last);
    console.log('now', nextFirst, nextLast);
    first = nextFirst;
    last = nextLast;

    isLocked = false;
  };

  // scroll state
  const updateViewport = () => { viewport = wrapper.getBoundingClientRect(); };
  const lock = () => { isLocked = true; };
  const unlock = (updateVirtualize: boolean = true) => {
    isLocked = false;
    if (pending.length > 0) {
      update(pending);
      pending = [];
    }

    if (updateVirtualize) virtualize(); // eslint-disable-line @typescript-eslint/no-use-before-define
  };

  // virtualize scroll elements
  const virtualize = () => {
    // nothing to virtualize
    if (current.length === 0) return;

    // prevent virtialzie when locked
    if (isLocked) return;

    // render initial elements, first min(batch, current.length) elements
    if (last - first <= 0 && last !== 0) {
      lock();
      updateViewport();

      const count = Math.min(batch, current.length);

      if (count > 0) {
        first = pivotBottom ? current.length - batch : 0;
        last = first - 1;
      }

      for (let i = 0; i < count; i += 1) mountChild(current[++last]);
      if (pivotBottom) container.scrollTop = offset = container.scrollHeight - viewport.height; // eslint-disable-line no-multi-assign

      unlock(false);
      virtualize();
      return;
    }

    // apply top elements and shrink bottom
    if (offset < threshold * viewport.height) {
      const count = Math.min(batch, first);

      if (count > 0) {
        lock();

        // keep scroll position
        let scrollPos = container.scrollTop;

        // calculate bottom space
        let removed = 0;
        let removeHeight = 0;
        const spaceBottom = container.scrollHeight - (container.scrollTop + viewport.height);

        while (removeHeight < spaceBottom - threshold * viewport.height && removed < count) {
          removeHeight += element(current[last - removed]).getBoundingClientRect().height;
          removed += 1;
        }

        // change DOM
        for (let i = 0; i < removed - 1; i += 1) unMountChild(current[last--]);
        for (let i = 0; i < count; i += 1) mountChild(current[--first], current[first + 1]);

        // recalculate
        for (let i = 0; i < count; i += 1) scrollPos += element(current[first + i]).getBoundingClientRect().height;

        // keep scroll
        container.scrollTop = offset = scrollPos; // eslint-disable-line no-multi-assign

        unlock();
      }

      if (first <= batch && onReachTop) onReachTop();
    }

    // apply bottom elements and shrink top
    if (container.scrollHeight - (container.scrollTop + viewport.height) < threshold * viewport.height) {
      const count = Math.min(batch, current.length - last - 1);

      if (count > 0) {
        lock();

        // keep scroll position
        const scrollPos = container.scrollTop;

        // calculate top space
        let removed = 0;
        let removeHeight = 0;
        let scrollDelta = 0;
        const spaceTop = container.scrollTop;

        while (removeHeight < spaceTop - threshold * viewport.height && removed < count) {
          scrollDelta = removeHeight;
          removeHeight += element(current[first + removed]).getBoundingClientRect().height;
          removed += 1;
        }

        // change DOM
        for (let i = 0; i < count; i += 1) mountChild(current[++last]);
        for (let i = 0; i < removed - 1; i += 1) unMountChild(current[first++]);

        // keep scroll
        container.scrollTop = offset = scrollPos - scrollDelta; // eslint-disable-line no-multi-assign

        unlock();
      }

      if (current.length - last - 1 <= batch && onReachBottom) onReachBottom();
    }
  };

  const scrollTo = (elm: HTMLElement) => {
    lock();

    // calculate
    const rect = elm.getBoundingClientRect();
    const rectTopOffset = container.scrollTop + rect.top - viewport.top;

    let scollValue = rectTopOffset;
    if (viewport.height > rect.height) scollValue -= (viewport.height - rect.height) / 2;
    else scollValue -= 50;

    elm.classList.add('focused');

    const from = container.scrollTop;
    const dy = scollValue - from;
    const duration = 300;
    let start: number | undefined;

    const animateScroll = (timestamp: number) => {
      if (!start) start = timestamp;

      const progress = timestamp - start;
      const percentage = Math.min(1, progress / duration);

      if (percentage > 0) {
        container.scrollTo(0, from + ease(percentage) * dy);
      }

      if (percentage < 1) {
        requestAnimationFrame(animateScroll);
      } else {
        unlock();
        elm.classList.remove('focused');
      }
    };

    requestAnimationFrame(animateScroll);
  };

  // scrollTo(item)
  const focus = (item: T) => {
    const index = current.indexOf(item);

    // data wasn't loaded yet
    if (index === -1) {
      focused = item;
      return;
    }

    // make transition
    if (index < first || index > last) {
      focused = item;
      update(current);
      return;
    }

    scrollTo(element(item));
  };

  // on items changed
  useObservable(container, items, (next: readonly T[]) => {
    if (isLocked) pending = next.slice(0);
    else {
      update(next);
      virtualize();
    }
  });

  // on container scrolled
  listen(container, 'scroll', () => {
    // release focused
    if (focused) focused = undefined;

    // prevent overscroll events
    if (container.scrollTop < 0) return;
    if (container.scrollTop + viewport.height > container.scrollHeight) return;

    // prevent repeating or disabled events
    if (container.scrollTop === offset || isLocked) return;

    // handle scroll
    offset = container.scrollTop;
    virtualize();
  }, { capture: true, passive: true });

  // lifecycle events
  useOnMount(container, updateViewport);
  useListenWhileMounted(container, window, 'resize', updateViewport);

  // return with interface
  return useInterface(wrapper, {
    // alias: scrollTo(item)
    focus,
    // clear list
    clear() {
      for (let i = first; i <= last; i += 1) {
        unMountChild(current[i]);
      }

      elements = {};
      current = [];
      pending = [];
      first = -1;
      last = -2;
    },
  });
}
