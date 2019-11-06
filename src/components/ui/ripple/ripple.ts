import { ComponentFactory } from 'core/factory';
import { div } from 'core/html';
import { Component, mount, el } from 'core/dom';
import { Child } from 'core/types';
import './ripple.scss';

type Props = {
  tag?: string,
  className?: string,
};

export class Ripple extends Component<HTMLElement> {
  constructor({ tag = 'div', className = '' }: Props, children: Child[]) {
    super();

    this.element = el(tag, { className: `ripple ${className}`, onClick: this.handleClick }, [
      div`.ripple__content`(
        ...children,
      ),
    ]);
  }

  handleClick = (event: MouseEvent) => {
    const effect = new div`.ripple__effect`();
    const rect = this.element.getBoundingClientRect();

    effect.style.left = `${event.clientX - rect.left}px`;
    effect.style.top = `${event.clientY - rect.top + rect.height / 2}px`;

    effect.addEventListener('animationend', () => effect.remove());

    mount(this.element, effect);
  };
}

export const ripple = ComponentFactory(Ripple);
