import { BehaviorSubject } from 'rxjs';
import { el, listen, mount, unmount, listenOnce } from 'core/dom';
import { useOnMount, useListenWhileMounted, useMaybeObservable } from 'core/hooks';
import './list.scss';

type Props = {
  items: readonly string[] | BehaviorSubject<readonly string[]>,
  renderer: (item: string) => HTMLElement,

  tag?: keyof HTMLElementTagNameMap,
  className?: string,
  threshold?: number,
  pivotBottom?: boolean,
  verticalPadding?: number,
  batch?: number,
  scrollBatch?: number,
  compare?: (left: string, right: string) => boolean,
  onFocus?: (item: string) => void,
  onReachTop?: () => void,
  onReachBottom?: () => void,
};

type LocalPosition = {
  top: number,
  height: number,
};

const ease = (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

const arr_contains = (a: readonly string[], b: readonly string[]): boolean => {
  for (let i = 0; i < b.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

/**
 * Scrollable virtualized list with flip animations
 *
 * @example
 * new VirtualizedList({
 *  items: data,
 *  renderer: (data) => div`.css`(text(data))
 * })
 */
export class VirtualizedList {
  /** HTML container: gets height and scrolls */
  public readonly container: HTMLElement;

  /** Scrollable view size */
  viewport: DOMRect;

  /** Scrollable inner content height */
  scrollHeight: number = 0;

  /** Flag for disabling updates */
  isLocked: boolean = false;

  /** Config */
  public cfg: {
    batch: number,
    pivotBottom: boolean,
    threshold: number,
    scrollBatch: number,
    compare?: (left: string, right: string) => boolean,
    onFocus?: (item: string) => void,
    onReachTop?: () => void,
    onReachBottom?: () => void,
  };

  /** Renderer function for elements */
  renderer: (item: string) => HTMLElement;

  /** Virtualized list html elements */
  elements: Record<string, HTMLElement> = {};

  /** Virtualized elements heights */
  heights: Record<string, number> = {};

  /** Virtualized elements offsets */
  offsets: Record<string, number> = {};

  /** Current elements ids before update */
  current: string[] = [];

  /** Pending elements to be updated */
  pending: string[] = [];

  /** List of newly mounted components, that pending for size recalculation */
  pendingRecalculate: string[] = [];

  /** Index of first displayed element (insde this.current) */
  first: number = -1;

  /** Index of last displayed element (insde this.current) */
  last: number = -2;

  /** Current scroll position */
  scrollTop: number = 0;

  /** Element that should be focused */
  focused?: string;

  /** Element that should be focused */
  focusedDirection?: number | undefined;

  /** Virst visible element at viewport */
  topElement?: string;

  constructor({
    tag,
    className,
    items,
    renderer,
    compare,
    threshold = 1,
    batch = 20,
    scrollBatch = batch,
    pivotBottom = false,
    onFocus,
    onReachTop,
    onReachBottom,
  }: Props) {
    this.container = el(tag || 'div', { className: `list ${className} ${pivotBottom ? '-reversed' : ''}` });

    this.renderer = renderer;
    this.cfg = {
      batch,
      scrollBatch,
      pivotBottom,
      threshold,
      compare,
      onFocus,
      onReachTop,
      onReachBottom,
    };

    // set initial viewport and handle its updates
    this.viewport = this.container.getBoundingClientRect();
    useOnMount(this.container, this.updateViewport);
    useListenWhileMounted(this.container, window, 'resize', this.updateViewport);

    // when items changed
    useMaybeObservable(this.container, items, (next: readonly string[]) => {
      if (this.isLocked) this.pending = next.slice(0);
      else {
        this.update(next);
      }
    });

    // on container scrolled
    listen(this.container, 'scroll', () => {
      // release focused
      // if (this.focused && !this.isLocked) this.focused = undefined;

      const offset = this.container.scrollTop;

      // prevent repeating or disabled events
      if (offset === this.scrollTop || this.isLocked) return;

      // handle scroll
      this.scrollTop = offset;

      // prevent overscroll events
      // if (offset < 0) return;
      // if (offset + this.viewport.height > this.scrollHeight) return;

      this.virtualize();
    }, { passive: true, capture: true });
  }

  updateViewport = () => {
    this.viewport = this.container.getBoundingClientRect();
    this.scrollHeight = this.container.scrollHeight;
  };

  // create dom elements inside virtial scroll
  createElements(items: readonly string[]) {
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];

      if (!this.elements[item]) this.elements[item] = this.renderer(item);
    }
  }

  // Lock and unlock updates
  lock() { this.isLocked = true; }
  unlock() {
    this.isLocked = false;

    if (this.pending.length > 0) {
      const next = this.pending;
      this.pending = [];
      this.update(next);
    }
  }

  // mount item
  mount(item: string, before?: string) {
    mount(this.container, this.elements[item], before ? this.elements[before] : undefined);
    if (!this.heights[item]) this.pendingRecalculate.push(item);
  }

  // mount before node, not data
  mountBeforeNode(item: string, before?: Node) {
    const elm = this.elements[item];
    unmount(elm);
    mount(this.container, elm, before);
    if (!this.heights[item]) this.pendingRecalculate.push(item);
  }

  // unmount item
  unMount(item: string) { unmount(this.elements[item]); }

  // update heights
  updateHeigths(force: boolean = false) {
    if (force) this.pendingRecalculate = this.current;

    // for (let i = this.first; i <= this.last; i += 1) {
    //   const item = this.current[i];

    for (let i = 0; i < this.pendingRecalculate.length; i += 1) {
      const item = this.pendingRecalculate[i];
      this.heights[item] = this.elements[item].offsetHeight || this.heights[item] || 0;
    }

    this.pendingRecalculate = [];
  }

  updateOffsets() {
    let offset = 0;
    for (let i = this.first; i <= this.last; i++) {
      const item = this.current[i];
      this.offsets[item] = offset;
      offset += this.heights[item];
    }
  }

  // hard update only keys without rendering
  updateData(next: readonly string[]) {
    this.current = next.slice(0);
    this.createElements(this.current);
  }

  // pefrom list update with flip animations
  update(next: readonly string[]) {
    const focusedIndex = this.focused ? next.indexOf(this.focused) : -1;

    if (focusedIndex !== -1 && this.focused) {
      this.scrollVirtualizedRemove();
      this.first = -1;
      this.last = -2;
      this.updateData(next);
      this.scrollVirtualizedTo(this.focused, this.focusedDirection);
      this.focused = undefined;
      return;
    }

    // pass if nothing is rendered
    if (this.current.length === 0 || this.last < this.first) {
      this.updateData(next);
      this.virtualize();
      return;
    }

    // fallback if no changes
    if (this.current.length === next.length && arr_contains(this.current, next)) {
      this.updateData(next);
      this.virtualize();
      return;
    }

    // fallback if current data is a part of next (lazy load)
    if (this.cfg.pivotBottom === false && arr_contains(next, this.current)) {
      this.updateData(next);
      this.virtualize();
      return;
    }

    if (this.cfg.pivotBottom === true && arr_contains(next.slice(-this.current.length), this.current)) {
      this.first = this.first + next.length - this.current.length;
      this.last = this.last + next.length - this.current.length;
      this.updateData(next);
      this.virtualize();
      return;
    }

    this.createElements(next);
    this.isLocked = true;

    // visible elements
    const visible = this.first > -1 && this.last > -1 ? this.current.slice(this.first, this.last + 1) : [];

    // visible indexes after update
    let nextFirst;
    let nextLast;

    // keep first element visible
    if (this.cfg.pivotBottom === false) {
      nextFirst = this.first;
      nextLast = Math.min(this.first + visible.length - 1, next.length - 1);

    // keep last element visible
    } else {
      nextLast = Math.max(-1, next.length - (this.current.length - this.last - 1) - 1);
      nextFirst = Math.max(nextLast - (this.last - this.first), 0);
    }

    // console.log('flip')

    // no need to rerender
    if (nextFirst > -1 && next.slice(nextFirst, visible.length) === visible) {
      this.updateData(next);
      this.virtualize();
      this.isLocked = false;
      return;
    }

    const nextVisible = [];
    const flipFrom: Record<string, LocalPosition> = {};
    const flipTo: Record<string, LocalPosition> = {};

    // keep start position for flip
    for (let i = 0; i < visible.length; i += 1) {
      // flipFrom[visible[i]] = this.elements[visible[i]].getBoundingClientRect();
      flipFrom[visible[i]] = {
        top: this.offsets[visible[i]] - this.scrollTop,
        height: this.heights[visible[i]],
      };
    }

    const renderedItems: string[] = [];
    // remove redundant old visible elements
    for (let i = 0; i < visible.length; i++) {
      const item = visible[i];
      const index = next.indexOf(item);

      // remove animation artifacts
      if (this.elements[item].classList.contains('list__flipping')) {
        this.elements[item].style.transformOrigin = '';
        this.elements[item].classList.remove('list__flipping');
      }

      if (index !== -1 && index >= nextFirst && index <= nextLast) {
        renderedItems.push(item);
      } else {
        this.unMount(item);
      }
    }

    let j = 0;
    for (let i = nextFirst; i <= nextLast; i += 1) {
      const nextItem = next[i];
      const elm = this.elements[nextItem];
      const nextItemIndex = renderedItems.indexOf(nextItem);

      // add new element
      if (nextItemIndex === -1) {
        this.mount(nextItem, renderedItems[j]);
        elm.classList.add('list__appeared');
        listenOnce(elm, 'animationend', () => elm.classList.remove('list__appeared'));

      // swap elements
      } else if (nextItemIndex !== j) {
        let item = renderedItems[j];
        let item2 = '';

        renderedItems[j] = renderedItems[nextItemIndex];
        for (let s = j + 1; s <= nextItemIndex; s++) {
          item2 = renderedItems[s];
          renderedItems[s] = item;
          item = item2;
        }
        j++;

        this.mount(item, renderedItems[j]);
      } else {
        j++;
      }

      // update next visible shortcut
      nextVisible.push(nextItem);
    }

    this.container.scrollTop = this.scrollTop -= (this.scrollHeight - this.container.scrollHeight);
    this.scrollHeight = this.container.scrollHeight;
    this.updateOffsets();

    let offset = 0;
    // get position of nextVisible elements
    for (let i = 0; i < nextVisible.length; i += 1) {
      // flipTo[nextVisible[i]] = this.elements[nextVisible[i]].getBoundingClientRect();
      flipTo[nextVisible[i]] = {
        top: offset - this.scrollTop,
        height: this.heights[nextVisible[i]],
      };

      offset += this.heights[nextVisible[i]];
    }

    // prepare flipping elements
    let animated = Object.keys(flipTo);
    for (let i = 0; i < animated.length; i += 1) {
      const item = animated[i];

      if (renderedItems.indexOf(item) === -1) {
        delete flipTo[item];
        continue;
      }

      const dy = flipFrom[item].top - flipTo[item].top;

      if (dy === 0) {
        delete flipTo[item];
      } else {
        this.elements[item].style.transformOrigin = 'top left';
        this.elements[item].style.transform = `translate(0px, ${dy}px)`;
      }
    }

    // get final list of els to animate
    animated = Object.keys(flipTo);

    const animate = () => {
      for (let i = 0; i < animated.length; i += 1) {
        const elm = this.elements[animated[i]];

        elm.classList.add('list__flipping');
        elm.style.transform = '';

        listenOnce(elm, 'transitionend', () => {
          elm.style.transformOrigin = '';
          elm.classList.remove('list__flipping');
        });
      }
    };

    // Wait next frame
    // temp fix for chrome
    requestAnimationFrame(
      () => requestAnimationFrame(animate),
    );

    this.updateData(next);
    this.first = nextFirst;
    this.last = nextLast;
    this.updateOffsets();
    this.isLocked = false;
    this.virtualize();
  }

  updateTopElement() {
    const prevTop = this.topElement;
    // if (this.topElement
    //   && this.offsets[this.topElement] < this.scrollTop
    //   && this.offsets[this.topElement] + this.heights[this.topElement] > this.scrollTop) return;

    for (let i = this.first; i <= this.last; i++) {
      const item = this.current[i];
      if (this.offsets[item] <= this.scrollTop) {
        this.topElement = this.current[i];
      } else {
        break;
      }
    }

    if (this.cfg.onFocus && this.topElement && this.topElement !== prevTop) this.cfg.onFocus(this.topElement);
  }

  // virtualize scroll elements
  virtualize() {
    // nothing to virtualize
    if (this.current.length === 0) return;

    // prevent virtialzie when locked
    if (this.isLocked) return;

    this.lock();
    let skipNext = false;

    // render initial elements, first min(batch, current.length) elements
    if (this.last - this.first < 0) {
      this.updateViewport();

      const count = Math.min(this.cfg.batch, this.current.length);

      if (count > 0) {
        this.first = this.cfg.pivotBottom ? Math.max(0, this.current.length - this.cfg.batch) : 0;
        this.last = this.first - 1;
      }

      for (let i = 0; i < count; i += 1) this.mount(this.current[++this.last]);

      this.scrollHeight = this.container.scrollHeight;

      // set initial scroll position
      if (this.cfg.pivotBottom) this.container.scrollTop = this.scrollTop = this.scrollHeight - this.viewport.height;

      skipNext = true;
    }

    const prevFirst = this.first;
    const prevLast = this.last;

    // apply top elements and shrink bottom
    if (!skipNext && this.scrollTop < this.cfg.threshold * this.viewport.height) {
      const count = Math.min(this.cfg.batch, this.first);

      if (count > 0) {
        const spaceBottom = this.scrollHeight - (this.scrollTop + this.viewport.height);
        let removedHeight = 0;

        // remove bottom elements
        while (this.last > 0 && removedHeight < spaceBottom - this.cfg.threshold * this.viewport.height) {
          if (removedHeight > 0) this.unMount(this.current[this.last--]);
          removedHeight += this.heights[this.current[this.last]];

          if (removedHeight === 0) throw new Error('height cannot be zero');
        }

        for (let i = 0; i < count; i += 1) this.mount(this.current[--this.first], this.current[this.first + 1]);
        skipNext = true;
      }

      if (this.cfg.onReachTop && this.first <= this.cfg.batch * 3) this.cfg.onReachTop();
    }

    // apply bottom elements and shrink top
    if (!skipNext && this.scrollHeight - (this.scrollTop + this.viewport.height) < this.cfg.threshold * this.viewport.height) {
      const count = Math.min(this.cfg.batch, this.current.length - this.last - 1);

      if (count > 0) {
        let removedHeight = 0;

        // remove top elements
        while (this.first < this.current.length && removedHeight < this.scrollTop - this.cfg.threshold * this.viewport.height) {
          if (removedHeight > 0) this.unMount(this.current[this.first++]);
          removedHeight += this.heights[this.current[this.first]];
          if (removedHeight === 0) throw new Error('height cannot be zero');
        }

        // apply bottom
        for (let i = 0; i < count; i += 1) this.mount(this.current[++this.last]);
      }

      if (this.cfg.onReachBottom && this.current.length - this.last - 1 <= this.cfg.batch * 3) this.cfg.onReachBottom();
    }

    if (this.pendingRecalculate.length > 0) this.updateHeigths();

    // update scroll inner content height
    if (prevFirst !== this.first || prevLast !== this.last) {
      this.updateOffsets();
      this.scrollHeight = this.container.scrollHeight;
    }

    // keep scroll position if top elements was added
    if (prevFirst > this.first) {
      let deltaHeight = 0;

      for (let i = this.first; i < prevFirst; i++) {
        deltaHeight += this.heights[this.current[i]];
      }

      this.scrollTop += deltaHeight;
      const deferred = this.container.scrollTop = this.scrollTop;

      // fix chrome
      requestAnimationFrame(() => {
        if (Math.abs(this.container.scrollTop - deferred) > 20) this.container.scrollTop = this.scrollTop = deferred;
      });
    }

    // keep scroll position if top elements was added
    if (prevFirst < this.first) {
      let deltaHeight = 0;

      for (let i = prevFirst; i < this.first; i++) {
        deltaHeight += this.heights[this.current[i]];
      }

      this.scrollTop -= deltaHeight;
      const deferred = this.container.scrollTop = this.scrollTop;

      // fix chrome
      requestAnimationFrame(() => {
        if (Math.abs(this.container.scrollTop - deferred) > 20) this.container.scrollTop = deferred;
      });
    }

    this.updateTopElement();
    this.unlock();
  }

  offset(item: string) {
    const index = this.current.indexOf(item);
    let offset = 0;

    for (let i = this.first; i < index; i++) {
      offset += this.heights[this.current[i]];
    }

    return offset;
  }

  // scrollTo(item)
  focus(item: string, direction?: number) {
    const index = this.current.indexOf(item);

    // data wasn't loaded yet
    if (index === -1) {
      this.focusedDirection = direction;
      this.focused = item;
      return;
    }

    // make transition
    if (index < this.first || index > this.last) {
      this.scrollVirtualizedTo(item, direction || (index < this.first ? 1 : -1));
      return;
    }

    this.scrollTo(item);
  }

  clear() {
    for (let i = this.first; i <= this.last; i += 1) {
      this.unMount(this.current[i]);
    }

    this.elements = {};
    this.heights = {};
    this.current = [];
    this.pending = [];
    this.pendingRecalculate = [];
    this.first = -1;
    this.last = -2;
  }

  scrollVirtualizedRemove() {
    // shrink elements to viewport
    let height = 0;
    let end = this.topElement ? this.current.indexOf(this.topElement) : this.first;
    const start = end;

    while (height < this.viewport.height && end <= this.last) {
      height += this.heights[this.current[end]];
      end++;
    }

    if (end < start) end = start;

    // const rects: Record<number, DOMRect> = {};

    // for (let i = start; i < end; i++) {
    //   rects[i] = this.elements[this.current[i]].getBoundingClientRect();
    // }

    // animate shrinked elements
    for (let i = this.first; i <= this.last; i++) {
      const ritem = this.current[i];

      this.unMount(ritem);
      // if (i < start || i >= end) {
      //   this.unMount(ritem);
      // } else {
      //   const elm = this.elements[ritem];
      //   elm.style.top = `${rects[i].top - this.viewport.top}px`;
      //   elm.classList.add('list__scroll-out');

      //   listenOnce(elm, 'transitionend', () => {
      //     elm.classList.remove('list__scroll-out');
      //     elm.style.transform = '';
      //     elm.style.top = '';
      //     unmount(elm);
      //   });

      //   elm.style.transform = `translate(0, ${height * direction}px)`;
      // }
    }

    return [start, end, height || this.viewport.height];
  }

  scrollVirtualizedTo(item: string, direction: number = -1) {
    const indexOfItem = this.current.indexOf(item);
    if (indexOfItem === -1) return;

    this.lock();
    const [, end, height] = this.scrollVirtualizedRemove();

    // display new elements
    this.first = Math.max(0, (direction < 0) ? end : 0, indexOfItem - Math.ceil(this.cfg.scrollBatch / 2));
    this.last = Math.min(this.current.length - 1, indexOfItem + Math.ceil(this.cfg.scrollBatch / 2));

    this.elements[item].classList.add('focused');

    for (let i = this.first; i <= this.last; i++) {
      const nitem = this.current[i];
      this.mount(nitem);
    }

    this.scrollHeight = this.container.scrollHeight;
    this.updateHeigths();
    this.updateOffsets();
    this.container.scrollTop = this.scrollTop = this.getScrollToValue(item);
    this.updateTopElement();

    // animate new elements
    for (let i = this.first; i <= this.last; i++) {
      const ritem = this.current[i];

      const elm = this.elements[ritem];
      elm.style.transform = `translate(0, ${height * direction * -1}px)`;

      listenOnce(elm, 'transitionend', () => {
        elm.classList.remove('list__scroll-in');
      });

      // chrome fix for 2 frames
      requestAnimationFrame(() => {
        elm.classList.add('list__scroll-in');
        elm.style.transform = '';
      });
    }

    setTimeout(() => {
      this.isLocked = false;
      this.elements[item].classList.remove('focused');
      this.container.scrollTop = this.scrollTop = this.getScrollToValue(item);
      this.updateOffsets();
      this.virtualize();
    }, 300);
  }

  getScrollToValue(item: string, centered: boolean = true) {
    let scrollValue = this.offsets[item];
    if (centered && this.viewport.height > this.heights[item]) scrollValue -= (this.viewport.height - this.heights[item]) / 2;

    scrollValue = Math.max(0, scrollValue);
    scrollValue = Math.min(this.scrollHeight - this.viewport.height, scrollValue);

    return scrollValue;
  }

  scrollTo(item: string) {
    this.lock();

    const scrollValue = this.getScrollToValue(item);

    const y = this.scrollTop;
    const dy = scrollValue - y;
    const duration = 300;
    let start: number | undefined;

    const elm = this.elements[item];
    elm.classList.add('focused');

    const animateScroll = (timestamp: number) => {
      if (!start) start = timestamp;

      const progress = timestamp - start;
      const percentage = Math.min(1, progress / duration);

      if (percentage > 0) {
        this.container.scrollTo(0, y + ease(percentage) * dy);
      }

      if (percentage < 1) {
        requestAnimationFrame(animateScroll);
      } else {
        this.scrollTop = this.container.scrollTop;
        elm.classList.remove('focused');
        this.isLocked = false;
        this.virtualize();
      }
    };

    requestAnimationFrame(animateScroll);
  }
}

/**
 * Also available as function
 */
export default function list(props: Props) {
  const controller = new VirtualizedList(props);
  return controller.container;
}
