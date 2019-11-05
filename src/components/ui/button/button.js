// @flow

import Component from 'core/component';
import { ComponentFactory } from 'core/factory';
import { ripple, Ripple } from '../ripple/ripple';
import './button.scss';

type Props = {
  label?: string,
};

export class Button extends Component<HTMLDivElement> {
  container: Ripple;

  constructor({ label = '' }: Props) {
    super();

    this.ref = new ripple`.button`(
      label,
    );
  }
}

export const button = ComponentFactory(Button);
