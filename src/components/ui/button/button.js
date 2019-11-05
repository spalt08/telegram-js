// @flow

import Component from 'core/component';
import { ripple, Ripple } from '../ripple/ripple';
import './button.scss';

type Props = {
  label?: string,
};

class Button extends Component<HTMLDivElement> {
  container: Ripple;

  constructor({ label = '' }: Props) {
    super();

    this.container = ripple`.button`(
      label,
    )();

    this.ref = this.container.ref;
  }
}

export default (props: Props) => () => new Button(props);
