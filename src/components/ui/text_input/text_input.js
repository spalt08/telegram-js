// @flow

import Component from 'core/component';
import { ComponentFactory } from 'core/factory';
import { div, input } from 'core/html';
import './text_input.scss';

type Props = {
  onChange?: (value: string) => any;
  onFocus?: () => any;
  onBlur?: () => any;
  label?: string,
  ref?: (HTMLInputElement) => any,
};

export class TextInput extends Component<HTMLDivElement> {
  label: HTMLDivElement;

  input: HTMLInputElement;

  constructor({ label = '', onChange, onFocus, onBlur, ref }: Props) {
    super();

    this.ref = new div`.input`(
      this.input = new input({ type: 'text' }),
      this.label = new div`.input__label`(label),
    );

    let filled = false;

    this.input.onfocus = onFocus;
    this.input.onblur = onBlur;
    this.input.oninput = (event: InputEvent) => {
      const value = (event.target instanceof HTMLInputElement) ? event.target.value : '';

      if (value && !filled) {
        this.ref.className = 'input filled';
        filled = true;
      }

      if (!value && filled) {
        this.ref.className = 'input';
        filled = false;
      }

      if (onChange) onChange(value);
    };

    if (ref) ref(this.input);
  }
}

export const textInput = ComponentFactory(TextInput);
