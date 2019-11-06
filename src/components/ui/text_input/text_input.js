// @flow

import Component from 'core/component';
import { ComponentFactory } from 'core/factory';
import { div, input } from 'core/html';
import './text_input.scss';

type Props = {
  onChange?: (value: string) => any;
  onFocus?: () => any;
  onBlur?: () => any;
  onKeyDown?: () => any;
  label?: string,
  name?: string,
  ref?: (HTMLInputElement) => any,
};

export class TextInput extends Component<HTMLDivElement> {
  label: HTMLDivElement;

  input: HTMLInputElement;

  constructor({ label = '', onChange, onFocus, onBlur, ref, onKeyDown, name }: Props) {
    super();

    this.ref = new div`.input`(
      this.input = new input({ type: 'text', name }),
      this.label = new div`.input__label`(label),
    );

    let filled = false;
    let focused = false;

    this.input.onfocus = () => {
      if (onFocus) onFocus();
      focused = true;
      this.ref.className = `input focused${filled ? ' filled' : ''}`;
    };

    this.input.onblur = () => {
      if (onBlur) onBlur();
      focused = false;
      this.ref.className = `input${filled ? ' filled' : ''}`;
    };

    this.input.onkeydown = onKeyDown;
    this.input.oninput = (event: InputEvent) => {
      const value = (event.target instanceof HTMLInputElement) ? event.target.value : '';

      if (value && !filled) {
        this.ref.className = `input${focused ? ' focused' : ''} filled`;
        filled = true;
      }

      if (!value && filled) {
        console.log(focused);
        this.ref.className = `input${focused ? ' focused' : ''}`;
        filled = false;
      }

      if (onChange) onChange(value);
    };

    if (ref) ref(this.input);
  }
}

export const textInput = ComponentFactory(TextInput);
