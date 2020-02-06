import { el, mount, unmount, listen } from 'core/dom';
import { div } from 'core/html';
import { BehaviorSubject, of } from 'rxjs';
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
  onReachEnd?: () => void,
  onReachTop?: () => void,
  onReachBottom?: () => void,
};

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

  // scroll state
  let isLocked = false;
  let viewport = wrapper.getBoundingClientRect();
  const updateViewport = () => { viewport = wrapper.getBoundingClientRect(); };

  // cached items
  let current: readonly T[] = [];
  let first = -1;
  let last = -2;
  let offset: number = -1;
  let pending: readonly T[] = [];
  let focused: T | undefined;

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

  // const fetchLayout = () => {
  //   for (let i = first; i <= last; i++) {
  //     const id = key(current[i]);
  //     elements[id].rect = elements[id].el.getBoundingClientRect();
  //   }
  // };

  // virtualize scroll elements
  const virtualize = () => {
    // nothing to virtualize
    if (current.length === 0) return;

    // prevent virtialzie when locked
    if (isLocked) return;

    // render initial elements, first min(batch, current.length) elements
    if (last - first <= 0 && last !== 0) {
      updateViewport();
      const count = Math.min(batch, current.length);

      if (count > 0) {
        first = pivotBottom ? current.length - batch : 0;
        last = first - 1;
      }

      for (let i = 0; i < count; i += 1) mountChild(current[++last]);
      if (pivotBottom) container.scrollTop = offset = container.scrollHeight - viewport.height; // eslint-disable-line no-multi-assign

      console.log('init batch', count, ':', first, last);

      virtualize();
      return;
    }

    // apply top elements and shrink bottom
    if (offset < threshold * viewport.height) {
      const count = Math.min(batch, first);

      if (count > 0) {
        isLocked = true;

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

        isLocked = false;

        console.log('added top batch', count, ':', first, last, `(removed: ${removed})`);
        return;
      } else if (onReachTop) onReachTop();

    }

    // apply bottom elements and shrink top
    if (container.scrollHeight - (container.scrollTop + viewport.height) < threshold * viewport.height) {
      const count = Math.min(batch, current.length - last - 1);

      if (count > 0) {
        isLocked = true;

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

        isLocked = false;

        console.log('added top batch', count, ':', first, last, `(removed: ${removed})`);
      } else if (onReachBottom) onReachBottom();
    }
  };

  // on items changed
  useObservable(container, items, (next: readonly T[]) => {
    current = next;

    virtualize();
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
    focus(item: T) {
      focused = item;
    },

    // clear list
    clear() {
      for (let i = first; i <= last; i += 1) {
        unMountChild(current[i]);
      }

      elements = {};
      current = [];
      pending = [];
    },
  });
}
