import Component from 'core/component';
import { ComponentFactory } from 'core/factory';
import { ripple } from '../ripple/ripple';
import './button.scss';

type Props = {
  label?: string,
};

export class Button extends Component<HTMLDivElement> {
  constructor({ label = '' }: Props) {
    super();

    this.ref = ripple`.button`({ tag: 'button' })(
      label,
    );
  }
}

export const button = ComponentFactory(Button);
