// @flow

import Component from 'core/component';
import { mount } from 'core/dom';
import ClickableArea from '../clickable_area/clickable_area';
import './button.scss';

type Props = {
  label?: string,
};

class Button extends Component<HTMLDivElement> {
  constructor({ label = '' }: Props) {
    super();

    this.container = new ClickableArea({
      className: 'button',
      ref: (ref) => { this.ref = ref; },
    });

    mount(this.ref, label);
  }
}

export default (props: Props) => () => new Button(props);
