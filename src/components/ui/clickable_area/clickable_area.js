// @flow

import Component from 'core/component';
import { div } from 'core/html';
import { mount } from 'core/dom';
import './clickable_area.scss';

type Props = {
  tag?: string,
  className?: string,
  ref?: () => any,
};

export default class ClickableArea extends Component<HTMLElement> {
  boundingRect: DOMRect;

  constructor({ tag = 'div', className, ref }: Props) {
    super(tag, { className: `clickable ${className}` });

    if (ref) ref(this.ref);

    // To Do: mount event
    setTimeout(() => {
      this.boundingRect = this.ref.getBoundingClientRect();
    }, 200);

    this.ref.onclick = (event: MouseEvent) => {
      const effect = new div`.clickable__effect`();

      effect.style.left = `${event.clientX - this.boundingRect.left}px`;
      effect.style.top = `${event.clientY - this.boundingRect.top + this.boundingRect.height / 2}px`;

      effect.addEventListener('animationend', () => effect.remove());

      mount(this.ref, effect);
    };
  }
}
