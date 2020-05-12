import { MaybeObservable } from 'core/types';
import { div } from 'core/html';
import './list.scss';
import { useMaybeObservable } from 'core/hooks';
import { mount, animationFrameStart, unmountChildren, listen, unmount, listenOnce } from 'core/dom';

type ListConfig = {
  batch: number,
  pivotBottom?: boolean,
  threshold: number,
  onReachTop?: () => void,
  onReachBottom?: () => void,
};

type Props = Partial<ListConfig> & {
  className?: string,
  items: MaybeObservable<readonly string[]>,
  renderer: (index: string) => HTMLElement,
  renderGroup?: (index: string) => HTMLElement,
  selectGroup?: (index: string) => string;
};

const arr_contains = (a: readonly string[], b: readonly string[]): boolean => {
  for (let i = 0; i < b.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

// safari polyfill
if (!window.queueMicrotask) {
  window.queueMicrotask = (cb: () => void) => cb();
}

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
  container: HTMLDivElement;
  elements: Record<string, HTMLElement>;
  groups: Record<string, HTMLElement>;
  groupChildrenCount: Record<string, number>;
  heights: Record<string, number>;
  items: readonly string[];

  render: Props['renderer'];
  renderGroup: Props['renderGroup'];
  selectGroup: Props['selectGroup'];

  cfg: ListConfig;
  viewport?: ClientRect;

  scrollTop: number = -1;
  scrollHeight: number = 0;
  firstRendered: number = -1;
  lastRendered: number = -2;

  constructor({
    items,
    renderer,
    renderGroup,
    selectGroup,
    className = '',
    batch = 20,
    threshold = 1,
    pivotBottom = false,
    onReachBottom,
    onReachTop,
  }: Props) {
    this.container = div`.list${className}${pivotBottom ? '-reversed' : ''}`();

    this.cfg = { batch, pivotBottom, threshold, onReachTop, onReachBottom };
    this.elements = {};
    this.groups = {};
    this.groupChildrenCount = {};
    this.heights = {};
    this.items = [];

    this.render = renderer;
    this.renderGroup = renderGroup;
    this.selectGroup = selectGroup;

    // listen items changed
    useMaybeObservable(this.container, items, (next) => {
      this.update(next.slice(0));
    });

    // listen container scroll
    listen(this.container, 'scroll', () => {
      // not initialized
      if (this.scrollTop === -1) return;

      const prevOffset = this.scrollTop;
      const offset = this.scrollTop = this.container.scrollTop;

      // prevent repeating or disabled events
      if (offset === prevOffset || !this.viewport) return;

      // virtualize elements
      if (prevOffset < offset) this.onScrollDown();
      else this.onScrollUp();
    }, { passive: true, capture: true });
  }

  // get element by index
  element(id: string) {
    return this.elements[id] || (this.elements[id] = this.render(id));
  }

  // get group by element index
  group(id: string) {
    if (!this.selectGroup || !this.renderGroup) return this.groups[id] || (this.groups[id] = div());
    if (!this.groupChildrenCount[id]) this.groupChildrenCount[id] = 0;
    return this.groups[id] || (this.groups[id] = this.renderGroup(id));
  }

  // mount element
  mount(id: string, before?: string) {
    if (this.selectGroup && this.renderGroup) {
      const groupId = this.selectGroup(id);
      const group = this.group(groupId);

      if (before) {
        const groupBefore = this.group(this.selectGroup(before));

        // mount inside group before element
        if (group === groupBefore) {
          mount(group, this.element(id), this.element(before));
          if (!group.parentElement) mount(this.container, group);

        // mount in the end of group before next group
        } else {
          mount(group, this.element(id));
          if (!group.parentElement) mount(this.container, group, groupBefore);
        }

      // mount inside group at the end
      } else {
        mount(group, this.element(id));
        if (!group.parentElement) mount(this.container, group);
      }

      this.groupChildrenCount[groupId]++;

    // mount without groupping
    } else mount(this.container, this.element(id), before ? this.element(before) : undefined);
  }

  // unmount element
  unmount(id: string) {
    if (this.selectGroup && this.renderGroup) {
      const groupId = this.selectGroup(id);
      const group = this.group(groupId);
      const element = this.element(id);

      // unmount inside group and unmount group if become empty
      if (element.parentElement) {
        this.groupChildrenCount[groupId]--;
        unmount(element);
        if (this.groupChildrenCount[groupId] <= 0) unmount(group);
      }

    // unmount without groupping
    } else unmount(this.element(id));
  }

  // get height and number of elements to be removed
  calcElementsToRemove(offset: number, direction: -1 | 1, maxHeight: number) {
    let count = 0; let height = 0;

    // try to remove whole groups first
    if (this.renderGroup && this.selectGroup) {
      let groupId = this.selectGroup(this.items[offset]);
      let next = this.group(groupId).getBoundingClientRect().height;

      while (offset + count * direction > 0 && offset + count * direction < this.items.length && height + next < maxHeight) {
        height += next;
        count += this.groupChildrenCount[groupId];

        groupId = this.selectGroup(this.items[offset + count * direction]);
        next = this.group(groupId).getBoundingClientRect().height;
        if (next === 0) throw new Error('height cannot be zero');
      }
    }

    // remove elements inside group or without groupping
    let next = this.element(this.items[offset]).getBoundingClientRect().height;
    while (offset + count * direction >= 0 && offset + count * direction < this.items.length && height + next < maxHeight) {
      height += next;
      count++;
      next = this.element(this.items[offset + count * direction]).getBoundingClientRect().height;
      if (next === 0) throw new Error('height cannot be zero');
    }

    return { height, count };
  }


  // render initial state - first min(batch, current.length) elements
  init() {
    // already initied
    if (this.firstRendered + this.lastRendered >= 0) return;

    const appendCount = Math.min(this.cfg.batch, this.items.length);

    if (appendCount > 0) {
      this.firstRendered = this.cfg.pivotBottom ? Math.max(0, this.items.length - this.cfg.batch) : 0;
      this.lastRendered = this.firstRendered - 1;
    }

    // render {appendCount} elements
    for (let i = 0; i < appendCount; i += 1) this.mount(this.items[++this.lastRendered]);

    // set initial scroll position
    if (this.cfg.pivotBottom) {
      // avoid recalculation state inside frame (chrome)
      queueMicrotask(() => this.container.scrollTop = 9999);
    } else this.scrollTop = 0;

    // set initial values
    animationFrameStart().then(() => {
      this.viewport = this.container.getBoundingClientRect();
      this.scrollHeight = this.container.scrollHeight;
      this.scrollTop = this.container.scrollTop;
    });
  }

  // user has scrolled upper
  onScrollUp() {
    if (!this.viewport || this.viewport.height === 0) throw new Error('Viewport has not calculated yet');

    // apply top elements and shrink bottom
    if (this.scrollTop < this.cfg.threshold * this.viewport.height) {
      const appendCount = Math.min(this.cfg.batch, this.firstRendered);

      if (appendCount > 0) {
        const prevScrollHeight = this.scrollHeight;
        const availableBottomSpace = this.scrollHeight - (this.scrollTop + this.viewport.height) - this.cfg.threshold * this.viewport!.height;
        const toRemove = this.calcElementsToRemove(this.lastRendered, -1, availableBottomSpace);

        animationFrameStart().then(() => {
          // unmount elements
          for (let i = 0; i < toRemove.count; i++) this.unmount(this.items[this.lastRendered--]);

          // apply top elements
          for (let i = 0; i < appendCount; i += 1) this.mount(this.items[--this.firstRendered], this.items[this.firstRendered + 1]);

          // keep scroll position
          this.scrollHeight = this.container.scrollHeight;
          this.container.scrollTop = this.scrollTop += this.scrollHeight - prevScrollHeight + toRemove.height;

          animationFrameStart().then(() => {
            this.container.scrollTop = this.scrollTop;
          });
        });
      }

      if (this.cfg.onReachTop && this.firstRendered <= this.cfg.batch * 3) this.cfg.onReachTop();
    }
  }

  // user has scrolled lower
  onScrollDown() {
    if (!this.viewport || this.viewport.height === 0) throw new Error('Viewport has not calculated yet');

    // apply bottom elements and shrink top
    if (this.scrollHeight - this.scrollTop - this.viewport.height < this.cfg.threshold * this.viewport.height) {
      const appendCount = Math.min(this.cfg.batch, this.items.length - this.lastRendered - 1);

      if (appendCount > 0) {
        const availableTopSpace = this.scrollTop - this.cfg.threshold * this.viewport.height;
        const toRemove = this.calcElementsToRemove(this.firstRendered, 1, availableTopSpace);

        animationFrameStart().then(() => {
          // unmount elements
          for (let i = 0; i < toRemove.count; i++) this.unmount(this.items[this.firstRendered++]);

          // mount bottom elements
          for (let i = 0; i < appendCount; i += 1) this.mount(this.items[++this.lastRendered]);

          // keep scroll position
          this.container.scrollTop = this.scrollTop -= toRemove.height;

          animationFrameStart().then(() => {
            this.scrollHeight = this.container.scrollHeight;
            this.container.scrollTop = this.scrollTop;
          });
        });
      }
    }

    if (this.cfg.onReachBottom && this.items.length - this.lastRendered - 1 <= this.cfg.batch * 1) this.cfg.onReachBottom();
  }

  // perform behaviour subject list update
  update(next: readonly string[]) {
    // initial rendering
    if (this.items.length === 0 || this.lastRendered < this.firstRendered) {
      this.items = next;
      this.init();
      return;
    }

    // fallback if no changes
    if (this.items.length === next.length && arr_contains(this.items, next)) {
      this.items = next;
      return;
    }

    // fallback if current data is a part of next (lazy load)
    if (arr_contains(next, this.items) && (this.cfg.pivotBottom !== true || next.length - this.items.length > 5)) {
      this.items = next;
      this.onScrollDown();
      return;
    }

    // fallback if current data is a part of next (lazy load)
    if (this.cfg.pivotBottom !== false && arr_contains(next.slice(-this.items.length), this.items)) {
      this.firstRendered = this.firstRendered + next.length - this.items.length;
      this.lastRendered = this.lastRendered + next.length - this.items.length;
      this.items = next;
      this.onScrollUp();
      return;
    }

    // reorder elements
    this.flip(next);
  }

  flip(next: readonly string[]) {
    // visible elements
    const visible = this.items.slice(this.firstRendered, this.lastRendered + 1);

    // visible indexes after update
    let nextFirstRendererd: number;
    let nextLastRendered: number;

    // keep first element visible
    if (this.cfg.pivotBottom === false) {
      nextFirstRendererd = this.firstRendered;
      nextLastRendered = Math.min(this.firstRendered + visible.length - 1, next.length - 1);

    // keep last element visible
    } else {
      nextLastRendered = Math.max(-1, next.length - (this.items.length - this.lastRendered - 1) - 1);
      nextFirstRendererd = Math.max(nextLastRendered - (this.lastRendered - this.firstRendered), 0);
    }

    const nextVisible = [];
    const renderedItems: string[] = [];
    const nextIndices: Record<string, number> = {};
    const flipFrom: Record<string, ClientRect> = {};
    const flipTo: Record<string, ClientRect> = {};

    next.forEach((item, index) => nextIndices[item] = index);

    // keep start position for flip animation
    for (let i = 0; i < visible.length; i += 1) flipFrom[visible[i]] = this.element(visible[i]).getBoundingClientRect();

    // remove redundant old visible elements
    for (let i = 0; i < visible.length; i++) {
      const item = visible[i];
      const index = nextIndices[item];

      // remove animation artifacts
      if (this.elements[item].classList.contains('list__flipping')) {
        this.elements[item].style.transformOrigin = '';
        this.elements[item].classList.remove('list__flipping');
      }

      if (index !== -1 && index >= nextFirstRendererd && index <= nextLastRendered) {
        renderedItems.push(item);
      } else {
        this.unmount(item);
      }
    }

    let j = 0;
    for (let i = nextFirstRendererd; i <= nextLastRendered; i += 1) {
      const nextItem = next[i];
      const nextItemIndex = renderedItems.indexOf(nextItem);

      // add new element
      if (nextItemIndex === -1) {
        this.mount(nextItem, renderedItems[j]);
        const elm = this.element(nextItem);
        elm.classList.add('list__appearing');
        listenOnce(elm, 'animationend', () => elm.classList.remove('list__appearing'));

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

        this.unmount(item);
        this.mount(item, renderedItems[j]);
      } else j++;

      // update next visible shortcut
      nextVisible.push(nextItem);
    }

    this.container.scrollTop = this.scrollTop -= (this.scrollHeight - this.container.scrollHeight);
    this.scrollHeight = this.container.scrollHeight;

    // get position of nextVisible elements
    for (let i = 0; i < nextVisible.length; i += 1) flipTo[nextVisible[i]] = this.elements[nextVisible[i]].getBoundingClientRect();


    // recalculate & optimize flipping elements
    let animated = Object.keys(flipTo);
    for (let i = 0; i < animated.length; i += 1) {
      const item = animated[i];

      if (renderedItems.indexOf(item) === -1) delete flipTo[item];
      else {
        const dy = flipFrom[item].top - flipTo[item].top;
        const dx = flipFrom[item].left - flipTo[item].left;

        if (dy === 0 && dx === 0) delete flipTo[item];
        else {
          this.element(item).style.transformOrigin = 'top left';
          this.element(item).style.transform = `translate(${dx}px, ${dy}px)`;
        }
      }
    }

    // get final list of els to animate
    animated = Object.keys(flipTo);
    animationFrameStart().then(() => {
      for (let i = 0; i < animated.length; i += 1) {
        const elm = this.element(animated[i]);

        elm.classList.add('list__flipping');
        elm.style.transform = '';

        listenOnce(elm, 'transitionend', () => {
          elm.style.transformOrigin = '';
          elm.classList.remove('list__flipping');
        });
      }

      this.items = next.slice(0);
      this.firstRendered = nextFirstRendererd;
      this.lastRendered = nextLastRendered;
    });
  }

  focus() {}

  clear() {
    unmountChildren(this.container);

    this.elements = {};
    this.groups = {};
    this.groupChildrenCount = {};
    this.heights = {};
    this.items = [];
    this.firstRendered = -1;
    this.lastRendered = -2;
    this.scrollTop = -1;
  }
}

/**
 * Also available as function
 */
export default function list(props: Props) {
  const controller = new VirtualizedList(props);
  return controller.container;
}
