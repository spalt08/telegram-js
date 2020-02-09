import { BehaviorSubject } from 'rxjs';
import { el, listen, mount, unmount, listenOnce } from 'core/dom';
import { useOnMount, useListenWhileMounted, useMaybeObservable } from 'core/hooks';
import { div } from 'core/html';
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
  /** Wrapper for calculating height */
  public wrapper: HTMLDivElement;

  /** HTML element with scroll */
  container: HTMLElement;

  /** Scrollable view size */
  viewport: DOMRect;

  /** Scrollable inner content height */
  scrollHeight: number = 0;

  /** Flag for disabling updates */
  isLocked: boolean = false;

  /** Config */
  cfg: {
    batch: number,
    pivotBottom: boolean,
    threshold: number,
    scrollBatch?: number,
    compare?: (left: string, right: string) => boolean,
    onReachTop?: () => void,
    onReachBottom?: () => void,
  };

  /** Renderer function for elements */
  renderer: (item: string) => HTMLElement;

  /** Virtualized list html elements */
  elements: Record<string, HTMLElement> = {};

  /** Virtualized elements heights */
  heights: Record<string, number> = {};

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
    onReachTop,
    onReachBottom,
  }: Props) {
    this.wrapper = div`.list${className}${pivotBottom ? 'reversed' : ''}`(
      this.container = el(tag || 'div', { className: 'list__container' }),
    );

    this.renderer = renderer;
    this.cfg = {
      batch,
      scrollBatch,
      pivotBottom,
      threshold,
      compare,
      onReachTop,
      onReachBottom,
    };

    // set initial viewport and handle its updates
    this.viewport = this.wrapper.getBoundingClientRect();
    useOnMount(this.container, this.updateViewport);
    useListenWhileMounted(this.wrapper, window, 'resize', this.updateViewport);
    listen(this.wrapper, 'transitionend', this.updateViewport);
    listen(this.wrapper, 'animationend', this.updateViewport);

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
      if (this.focused && !this.isLocked) this.focused = undefined;

      const offset = this.container.scrollTop;

      // prevent overscroll events
      if (offset < 0) return;
      if (offset + this.viewport.height > this.scrollHeight) return;

      // prevent repeating or disabled events
      if (offset === this.scrollTop || this.isLocked) return;

      // handle scroll
      this.scrollTop = offset;
      this.virtualize();
    }, { capture: true, passive: true });
  }

  updateViewport = () => {
    this.viewport = this.wrapper.getBoundingClientRect();
    this.scrollHeight = this.container.scrollHeight;
  };

  // create dom elements inside virtial scroll
  createElements = (items: readonly string[]) => {
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];

      if (!this.elements[item]) this.elements[item] = this.renderer(item);
    }
  };

  // Lock and unlock updates
  lock = () => this.isLocked = true;
  unlock = () => {
    this.isLocked = false;

    if (this.pending.length > 0) {
      const next = this.pending;
      this.pending = [];
      this.update(next);
    }
  };

  // mount item
  mount = (item: string, before?: string) => {
    mount(this.container, this.elements[item], before ? this.elements[before] : undefined);
    if (!this.heights[item]) this.pendingRecalculate.push(item);
  };

  // mount before node, not data
  mountBeforeNode = (item: string, before?: Node) => {
    const elm = this.elements[item];
    unmount(elm);
    mount(this.container, elm, before);
    if (!this.heights[item]) this.pendingRecalculate.push(item);
  };

  // unmount item
  unMount = (item: string) => unmount(this.elements[item]);

  // update heights
  updateHeigths = (force: boolean = false) => {
    if (force) this.pendingRecalculate = Object.keys(this.heights);

    for (let i = 0; i < this.pendingRecalculate.length; i += 1) {
      const item = this.pendingRecalculate[i];
      this.heights[item] = this.elements[item].offsetHeight || this.heights[item];
    }

    this.pendingRecalculate = [];
  };

  // hard update only keys without rendering
  updateData = (next: readonly string[]) => {
    this.current = next.slice(0);
    this.createElements(this.current);
  };

  // pefrom list update with flip animations
  update = (next: readonly string[]) => {
    const focusedIndex = this.focused ? next.indexOf(this.focused) : -1;

    if (focusedIndex !== -1) {
      // todo handle changes
      this.updateData(next);
      this.virtualize();
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
      nextLast = Math.max(0, next.length - (this.current.length - this.last - 1) - 1);
      nextFirst = Math.max(nextLast - (this.last - this.first), 0);
    }

    // no need to rerender
    if (nextFirst > -1 && next.slice(nextFirst, visible.length) === visible) {
      this.updateData(next);
      this.virtualize();
      return;
    }

    this.lock();

    const nextVisible = [];
    const flipFrom: Record<string, LocalPosition> = {};
    const flipTo: Record<string, LocalPosition> = {};
    let offset = 0;

    // keep start position for flip
    for (let i = 0; i < visible.length; i += 1) {
      const height = this.heights[visible[i]];

      // force slowdown
      flipFrom[visible[i]] = this.elements[visible[i]].getBoundingClientRect();
      flipFrom[visible[i]] = this.elements[visible[i]].getBoundingClientRect();
      //  {
      //   top: offset,
      //   height,
      // };

      // force slowdown
      const task = height * height * height * height;
      offset += height + task - task;
    }

    // iterate through elements and update it's position
    let nextEl = this.container.firstChild;
    for (let i = nextFirst; i <= nextLast; i += 1) {
      const item = next[i];
      const elm = this.elements[item];
      // add new element
      if (visible.indexOf(item) === -1) {
        this.mount(item);

        elm.classList.add('list__appeared');
        listenOnce(elm, 'animationend', () => elm.classList.remove('list__appeared'));

      // swap elements
      } else if (this.elements[item] !== nextEl) {
        this.unMount(item);
        this.mountBeforeNode(item, nextEl as Node);
      }

      // continue
      nextEl = elm.nextSibling;

      // update next visible shortcut
      nextVisible.push(next[i]);
    }

    // remove old elements
    for (let i = 0; i < visible.length; i += 1) {
      const item = visible[i];
      const elm = this.elements[item];

      if (elm.classList.contains('list__flipping')) {
        elm.style.transformOrigin = '';
        elm.classList.remove('list__flipping');
      }

      if (nextVisible.indexOf(item) === -1) {
        unmount(elm);
        delete flipFrom[item];
      }
    }

    this.container.scrollTop = this.scrollTop;
    this.updateHeigths();

    // get position of nextVisible elements
    offset = 0;
    for (let i = 0; i < nextVisible.length; i += 1) {
      const height = this.heights[nextVisible[i]];

      // force slowdown
      flipTo[nextVisible[i]] = this.elements[nextVisible[i]].getBoundingClientRect();
      flipTo[nextVisible[i]] = this.elements[nextVisible[i]].getBoundingClientRect();
      // {
      //   top: offset,
      //   height,
      // };

      offset += height;
    }

    // prepare flipping elements
    let animated = Object.keys(flipFrom);
    for (let i = 0; i < animated.length; i += 1) {
      const item = animated[i];
      const dy = flipFrom[item].top - flipTo[item].top;

      if (dy === 0) {
        delete flipFrom[item];
      } else {
        this.elements[item].style.transformOrigin = 'top left';
        this.elements[item].style.transform = `translate(0px, ${dy}px)`;
      }
    }

    // get final list of els to animate
    animated = Object.keys(flipFrom);

    // Wait next frame
    requestAnimationFrame(() => {
      for (let i = 0; i < animated.length; i += 1) {
        const elm = this.elements[animated[i]];

        elm.classList.add('list__flipping');
        elm.style.transform = '';

        listenOnce(elm, 'transitionend', () => {
          elm.style.transformOrigin = '';
          elm.classList.remove('list__flipping');
        });
      }
    });

    this.updateData(next);
    this.first = nextFirst;
    this.last = nextLast;
    this.isLocked = false;
    this.virtualize();
  };

  // virtualize scroll elements
  virtualize = () => {
    // nothing to virtualize
    if (this.current.length === 0) return;

    // prevent virtialzie when locked
    if (this.isLocked) return;

    this.lock();
    let skipNext = false;

    // render initial elements, first min(batch, current.length) elements
    if (this.last - this.first <= 0 && this.last !== 0) {
      this.updateViewport();

      const count = Math.min(this.cfg.batch, this.current.length);

      if (count > 0) {
        this.first = this.cfg.pivotBottom ? Math.max(0, this.current.length - this.cfg.batch) : 0;
        this.last = this.first - 1;
      }

      for (let i = 0; i < count; i += 1) this.mount(this.current[++this.last]);

      // set initial scroll position
      if (this.cfg.pivotBottom) this.container.scrollTop = this.scrollTop = this.container.scrollHeight - this.viewport.height;

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

    // update scroll inner content height
    if (prevFirst !== this.first || prevLast !== this.last) {
      this.updateHeigths();
      this.scrollHeight = this.container.scrollHeight;
    }

    // keep scroll position if top elements was added
    if (prevFirst > this.first) {
      let deltaHeight = 0;

      for (let i = this.first; i < prevFirst; i++) {
        deltaHeight += this.heights[this.current[i]];
      }

      this.container.scrollTop = this.scrollTop += deltaHeight;
    }

    // keep scroll position if top elements was added
    if (prevFirst < this.first) {
      let deltaHeight = 0;

      for (let i = prevFirst; i < this.first; i++) {
        deltaHeight += this.heights[this.current[i]];
      }

      this.container.scrollTop = this.scrollTop -= deltaHeight;
    }

    this.unlock();
  };

  offset(item: string) {
    const index = this.current.indexOf(item);
    let offset = 0;

    for (let i = this.first; i < index; i++) {
      offset += this.heights[this.current[i]];
    }

    return offset;
  }

  // scrollTo(item)
  focus = (item: string) => {
    const index = this.current.indexOf(item);

    // data wasn't loaded yet
    if (index === -1) {
      this.focused = item;
      return;
    }

    // make transition
    if (index < this.first || index > this.last) {
      this.focused = item;
      // update(current);
      return;
    }

    this.scrollTo(item);
  };

  clear = () => {
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
  };

  scrollTo = (item: string) => {
    this.lock();

    let scrollValue = this.offset(item);
    if (this.viewport.height > this.heights[item]) scrollValue -= (this.viewport.height - this.heights[item]) / 2;

    scrollValue = Math.max(0, scrollValue);
    scrollValue = Math.min(this.scrollHeight - this.viewport.height, scrollValue);

    const y = this.scrollTop;
    const dy = scrollValue - y;
    const duration = 300;
    let start: number | undefined;

    const elm = this.elements[item];
    elm.classList.remove('focused');

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
        this.unlock();
        this.virtualize();
      }
    };

    requestAnimationFrame(animateScroll);
  };
}

/**
 * Also available as function
 */
export default function list(props: Props) {
  const controller = new VirtualizedList(props);
  return controller.wrapper;
}
