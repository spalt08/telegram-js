import { mount, unmount, listen } from 'core/dom';
import { useOnMount, useListenWhileMounted } from 'core/hooks';
import { div } from 'core/html';
import '../list/list.scss';

type Props = {
  threshold?: number,
  batch?: number,
  className?: string,
};

export default function scroll({ threshold = 400, batch = 5, className }: Props, ...children: Element[]) {
  const container = div({ className });

  let viewport = container.getBoundingClientRect();
  let offset = 0;
  let first = -1;
  let last = -1;

  const fillBottom = () => {
    let lastRect = last > -1 ? children[last].getBoundingClientRect() : { top: 0, height: 0 };

    if (last === -1) {
      while (last < children.length - 1 && viewport.height + threshold > lastRect.top - viewport.top + lastRect.height) {
        last += 1;
        mount(container, children[last]);
        lastRect = children[last].getBoundingClientRect();

        if (first === -1) first = last;
      }

      return;
    }

    if (last < children.length - 1 && viewport.height + threshold > lastRect.top - viewport.top + lastRect.height) {
      const num = Math.min(batch, children.length - last - 1);

      for (let i = 0; i < num; i += 1) {
        last += 1;
        mount(container, children[last]);
        lastRect = children[last].getBoundingClientRect();
      }
    }
  };

  const fillTop = () => {
    let firstRect = children[first].getBoundingClientRect();

    if (first > 1 && offset < threshold) {
      const num = Math.min(batch, first);

      for (let i = 0; i < num; i += 1) {
        first -= 1;
        mount(container, children[first], children[first + 1]);
        firstRect = children[last].getBoundingClientRect();
        offset += firstRect.height;
      }

      container.scrollTop = offset;
    }
  };

  const cleanTop = () => {
    let firstRect = first > -1 ? children[first].getBoundingClientRect() : { top: 0, height: 0 };

    if (first < children.length - 1 && offset > threshold) {
      const num = Math.min(batch, last);

      for (let i = 0; i < num; i += 1) {
        unmount(children[first]);
        offset -= firstRect.height;

        first += 1;
        firstRect = children[first].getBoundingClientRect();
      }

      container.scrollTop = offset;
    }
  };

  const cleanBottom = () => {
    let lastRect = children[last].getBoundingClientRect();

    if (last > 1 && viewport.height + threshold < lastRect.top - viewport.top + lastRect.height) {
      const num = Math.min(batch, last);

      for (let i = 0; i < num; i += 1) {
        unmount(children[last]);
        last -= 1;
        lastRect = children[last].getBoundingClientRect();
      }
    }
  };

  listen(container, 'scroll', () => {
    if (container.scrollTop === offset) return;

    if (container.scrollTop > offset) {
      offset = container.scrollTop;
      cleanTop();
      fillBottom();
    } else {
      offset = container.scrollTop;
      fillTop();
      cleanBottom();
    }
  }, { capture: true, passive: true });

  useOnMount(container, () => {
    viewport = container.getBoundingClientRect();
    fillBottom();
  });

  useListenWhileMounted(container, window, 'resize', () => {
    viewport = container.getBoundingClientRect();
  });

  return container;
}
