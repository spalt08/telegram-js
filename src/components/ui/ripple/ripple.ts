import { div } from 'core/html';
import { mount, el, unmount, listen } from 'core/dom';
import { useInterface } from 'core/hooks';
import './ripple.scss';

interface Props extends Record<string, any> {
  tag?: keyof HTMLElementTagNameMap;
  className?: string;
  contentClass?: string;
  onClick?(event: MouseEvent): void;
}

/**
 * Any HTML element with click ripple animation
 */
export default function ripple({ tag = 'div', className = '', contentClass = '', onClick, ...props }: Props, children: Node[] = []) {
  const contentEl = div`.ripple__content ${contentClass}`(...children);
  const element = el(tag, { className: `ripple ${className}`, ...props }, [contentEl]);

  listen(element, 'click', (event) => {
    const rect = element.getBoundingClientRect();
    const effect = div`.ripple__effect`({
      style: {
        left: `${((event.clientX - rect.left) / (rect.right - rect.left)) * 100}%`,
        top: `${((event.clientY - rect.top) / (rect.bottom - rect.top)) * 100}%`,
      },
      onAnimationEnd: () => unmount(effect),
    });

    mount(element, effect);
  });

  if (onClick) {
    // After the ripple listener to show the animation first on click
    listen(element, 'click', onClick);
  }

  return useInterface(element, {
    mountChild(...moreChildren: Node[]) {
      moreChildren.forEach((child) => mount(contentEl, child));
    },
  });
}
