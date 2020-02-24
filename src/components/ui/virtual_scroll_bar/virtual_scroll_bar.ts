import { useInterface } from 'core/hooks';
import { div } from 'core/html';
import './virtual_scroll_bar.scss';

export default function virtualScrollBar() {
  const beforeThumb = div`.virtualScrollBar__before`();
  const thumb = div`.virtualScrollBar__thumb`();
  const afterThumb = div`.virtualScrollBar__after`();
  const container = div`.virtualScrollBar`(beforeThumb, thumb, afterThumb);
  return useInterface(container, {
    onScrollChange: (totalHeight: number, viewportHeight: number, offset: number) => {
      beforeThumb.style.flexBasis = `${offset}px`;
      afterThumb.style.flexBasis = `${Math.max(0, totalHeight - viewportHeight - offset)}px`;
    },
  });
}
