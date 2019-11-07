import { div } from 'core/html';
import { mount, el, unmount } from 'core/dom';
import { Child } from 'core/types';
import './ripple.scss';

type Props = {
  tag?: string,
  className?: string,
};

export default function ripple({ tag = 'div', className = '' }: Props, children: Child[]) {
  let handleClick = (_event: MouseEvent) => {};

  const element = el(tag, { className: `ripple ${className}`, onClick: handleClick }, [
    div`.ripple__content`(
      ...children,
    ),
  ]) as HTMLElement;

  handleClick = (event: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const effect = div`.ripple__effect`({
      style: {
        left: `${event.clientX - rect.left}px`,
        top: `${event.clientY - rect.top + rect.height / 2}px`,
      },
      onAnimationEnd: () => unmount(effect),
    });

    mount(element, effect);
  };

  return element;
}
