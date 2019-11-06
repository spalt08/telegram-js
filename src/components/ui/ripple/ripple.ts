import Component from 'core/component';
import { ComponentFactory } from 'core/factory';
import { div } from 'core/html';
import { mount, el } from 'core/dom';
import { Child } from 'core/types';
import './ripple.scss';

type Props = {
  tag?: string,
  className?: string,
};

export class Ripple extends Component<HTMLElement> {
  boundingRect: ClientRect;

  constructor({ tag = 'div', className = '' }: Props, children: Array<Child>) {
    super();

    this.ref = el(tag, { className: `ripple ${className}`, onClick: this.handleClick }, [
      div`.ripple__content`(
        ...children,
      ),
    ]);

    // To Do: mount event
    setTimeout(() => {
      this.boundingRect = this.ref.getBoundingClientRect();
    }, 200);
  }

  handleClick = (event: MouseEvent) => {
    const effect = new div`.ripple__effect`();

    effect.style.left = `${event.clientX - this.boundingRect.left}px`;
    effect.style.top = `${event.clientY - this.boundingRect.top + this.boundingRect.height / 2}px`;

    effect.addEventListener('animationend', () => effect.remove());

    mount(this.ref, effect);
  }
}

export const ripple = ComponentFactory(Ripple);
