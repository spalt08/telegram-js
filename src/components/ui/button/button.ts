import { Component } from 'core/dom';
import { ComponentFactory } from 'core/factory';
import { ripple } from '../ripple/ripple';
import './button.scss';

type Props = {
  label?: string,
};

export class Button extends Component<HTMLButtonElement> {
  constructor({ label = '' }: Props) {
    super();

    this.element = ripple`.button`({ tag: 'button' })(
      label,
    )() as HTMLButtonElement;
  }
}

export const button = ComponentFactory(Button);
