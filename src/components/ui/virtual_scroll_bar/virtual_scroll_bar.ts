import { useInterface, useListenWhileMounted, WithInterfaceHook } from 'core/hooks';
import { div } from 'core/html';
import './virtual_scroll_bar.scss';
import { listen } from 'core/dom';

export default function virtualScrollBar(scrollTo: (offset: number) => void) {
  const beforeThumb = div`.virtualScrollBar__before`();
  const thumb = div`.virtualScrollBar__thumb`();
  const afterThumb = div`.virtualScrollBar__after`();
  const container = div`.virtualScrollBar`(beforeThumb, thumb, afterThumb);

  let clickOffs: number | undefined;
  let latestScrollUpdate: { totalHeight: number, viewportHeight: number, offset: number } | undefined;
  listen(thumb, 'mousedown', (e) => {
    e.preventDefault();
    clickOffs = e.clientY - thumb.getBoundingClientRect().top;
  });

  useListenWhileMounted(thumb, window, 'mousemove', (ee: MouseEvent) => {
    if (clickOffs && latestScrollUpdate) {
      ee.preventDefault();
      const offs = ((ee.clientY - container.getBoundingClientRect().top - clickOffs) / container.clientHeight) * latestScrollUpdate.totalHeight;
      scrollTo(offs);
    }
  });

  useListenWhileMounted(thumb, window, 'mouseup', (ee: MouseEvent) => {
    if (clickOffs) {
      ee.preventDefault();
      clickOffs = undefined;
    }
  });

  let timer: any = 0;
  return useInterface(container, {
    onScrollChange: (totalHeight: number, viewportHeight: number, offset: number) => {
      latestScrollUpdate = { totalHeight, viewportHeight, offset };
      const before = offset;
      const after = Math.max(0, totalHeight - viewportHeight - offset);
      container.classList.toggle('visible', before > 0 || after > 0);
      beforeThumb.style.flexBasis = `${before}px`;
      afterThumb.style.flexBasis = `${after}px`;
      clearTimeout(timer);
      timer = setTimeout(() => {
        container.classList.remove('visible');
      }, 3000);
    },
  });
}

export type VirtualScrollBarInterface = ReturnType<typeof virtualScrollBar> extends WithInterfaceHook<infer I> ? I : never;
