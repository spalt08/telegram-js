import { useInterface, useListenWhileMounted, WithInterfaceHook } from 'core/hooks';
import { div } from 'core/html';
import { listen } from 'core/dom';

import './virtual_scroll_bar.scss';

const MIN_THUMB_HEIGHT = 40;

export default function virtualScrollBar(scrollTo: (offset: number) => void) {
  const beforeThumb = div`.virtualScrollBar__before`();
  const thumb = div`.virtualScrollBar__thumb`();
  const afterThumb = div`.virtualScrollBar__after`();
  const container = div`.virtualScrollBar`(beforeThumb, thumb, afterThumb);

  let clickOffset: number | undefined;
  let lastScrollUpdate: { totalHeight: number, viewportHeight: number, offset: number } | undefined;

  // desiredHeight of thumb is calculated as totalHeight / viewportHeight,
  // where totalHeight is total scroll height of virtualized container (including not materialized children).
  // actualHeight = max(MIN_THUMB_HEIGHT, desiredHeight)
  let thumbStyle = {
    top: 0,
    desiredHeight: 0,
    actualHeight: 0,
  };

  const updateThumbStyle = () => {
    if (!lastScrollUpdate || !lastScrollUpdate.totalHeight) {
      return;
    }
    const { clientHeight } = container;
    const { offset, totalHeight, viewportHeight } = lastScrollUpdate;

    let top = clientHeight * (offset / totalHeight);
    let actualHeight = clientHeight * (viewportHeight / totalHeight);
    const desiredHeight = actualHeight;
    if (actualHeight < MIN_THUMB_HEIGHT) {
      top *= (clientHeight - MIN_THUMB_HEIGHT) / (clientHeight - actualHeight);
      actualHeight = MIN_THUMB_HEIGHT;
    }

    thumbStyle = { top, desiredHeight, actualHeight };
  };

  listen(thumb, 'mousedown', (e) => {
    e.preventDefault();
    clickOffset = (e.clientY - thumb.getBoundingClientRect().top);
    container.classList.add('-grabbing');
  });

  useListenWhileMounted(thumb, window, 'mousemove', (e: MouseEvent) => {
    if (clickOffset && lastScrollUpdate) {
      e.preventDefault();
      const clientRect = container.getBoundingClientRect();
      let thumbOffset = e.clientY - clientRect.top - clickOffset;
      thumbOffset *= (clientRect.height - thumbStyle.desiredHeight) / (clientRect.height - thumbStyle.actualHeight);
      const virtualOffset = thumbOffset * (lastScrollUpdate.totalHeight / container.clientHeight);
      scrollTo(virtualOffset);
    }
  });

  useListenWhileMounted(thumb, window, 'mouseup', (e: MouseEvent) => {
    if (clickOffset) {
      container.classList.remove('-grabbing');
      e.preventDefault();
      clickOffset = undefined;
    }
  });

  let timer: any = 0;
  return useInterface(container, {
    onScrollChange: (totalHeight: number, viewportHeight: number, offset: number) => {
      lastScrollUpdate = { totalHeight, viewportHeight, offset };
      const before = offset;
      const after = totalHeight - viewportHeight - offset;
      container.classList.toggle('visible', before > 0 || after > 0);

      updateThumbStyle();
      const { top, actualHeight } = thumbStyle;
      thumb.style.top = `${top}px`;
      thumb.style.height = `${actualHeight}px`;
      clearTimeout(timer);
      timer = setTimeout(() => {
        container.classList.remove('visible');
      }, 2000);
    },
  });
}

export type VirtualScrollBarInterface = ReturnType<typeof virtualScrollBar> extends WithInterfaceHook<infer I> ? I : never;
