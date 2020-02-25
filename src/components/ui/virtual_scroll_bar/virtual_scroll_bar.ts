import { useInterface } from 'core/hooks';
import { div } from 'core/html';
import './virtual_scroll_bar.scss';

export default function virtualScrollBar() {
  const beforeThumb = div`.virtualScrollBar__before`();
  const thumb = div`.virtualScrollBar__thumb`();
  const afterThumb = div`.virtualScrollBar__after`();
  const container = div`.virtualScrollBar`(beforeThumb, thumb, afterThumb);
  let timer: any = 0;
  return useInterface(container, {
    onScrollChange: (totalHeight: number, viewportHeight: number, offset: number) => {
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
