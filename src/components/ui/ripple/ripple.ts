import { div } from 'core/html';
import { mount, el, unmount, listen } from 'core/dom';
import './ripple.scss';

type Props = {
  tag?: keyof HTMLElementTagNameMap,
  className?: string,
};

/**
 * Any HTML element with click ripple animation
 */
export default function ripple({ tag = 'div', className = '' }: Props, children: Node[]) {
  const element = el(tag, { className: `ripple ${className}` }, [
    div`.ripple__content`(
      ...children,
    ),
  ]);

  listen(element, 'click', (event) => {
    const rect = element.getBoundingClientRect();
    const effect = div`.ripple__effect`({
      style: {
        left: `${event.clientX - rect.left}px`,
        top: `${event.clientY - rect.top}px`,
      },
      onAnimationEnd: () => unmount(effect),
    });

    mount(element, effect);
  });

  return element;
}
