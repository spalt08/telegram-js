import { el, mount, unmount, listenOnce, listen } from 'core/dom';
import { useObservable, useOnMount, useWhileMounted, useListenWhileMounted } from 'core/hooks';
import { div } from 'core/html';
import '../list/list.scss';


export default function scroll(...children: Element[]) {
  const container = div`.list`();
  const threshold = 300;

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
      last += 1;
      mount(container, children[last]);
      lastRect = children[last].getBoundingClientRect();

      if (first === -1) first = last;
    }
  };

  const fillTop = () => {
    let firstRect = children[first].getBoundingClientRect();

    if (first > 1 && offset < threshold) {
      first -= 1;
      mount(container, children[first], children[first + 1]);
      firstRect = children[last].getBoundingClientRect();
      offset += firstRect.height;
      container.scrollTop = offset;
    }
  };

  const cleanTop = () => {
    let firstRect = first > -1 ? children[first].getBoundingClientRect() : { top: 0, height: 0 };

    while (first < children.length - 1 && offset > threshold) {
      if (first > -1) {
        unmount(children[first]);
        offset -= firstRect.height;
        container.scrollTop = offset;
      }

      first += 1;
      firstRect = children[first].getBoundingClientRect();
    }
  };

  const cleanBottom = () => {
    let lastRect = children[last].getBoundingClientRect();

    while (last > 1 && viewport.height + threshold < lastRect.top - viewport.top + lastRect.height) {
      unmount(children[last]);
      last -= 1;
      lastRect = children[last].getBoundingClientRect();
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
  });

  useOnMount(container, () => {
    viewport = container.getBoundingClientRect();
    fillBottom();
  });

  useListenWhileMounted(container, window, 'resize', () => {
    viewport = container.getBoundingClientRect();
  });

  return container;
}
