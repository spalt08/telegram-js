import { Component } from 'core/dom';
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
  autocomplete?: string,
  ref?: (ref: HTMLInputElement) => any,
};

export class TextInput extends Component<HTMLDivElement> {
  label: HTMLDivElement;

  input: HTMLInputElement;

  constructor({ label = '', onChange, onFocus, onBlur, ref, autocomplete, onKeyDown, name }: Props) {
    super();

    this.element = new div`.input`(
      this.input = new input({ type: 'text', name, autocomplete }),
      this.label = new div`.input__label`(label),
    );

    let filled = false;
    let focused = false;

    this.input.onfocus = () => {
      if (onFocus) onFocus();
      focused = true;
      this.element.className = `input focused${filled ? ' filled' : ''}`;
    };

    this.input.onblur = () => {
      if (onBlur) onBlur();
      focused = false;
      this.element.className = `input${filled ? ' filled' : ''}`;
    };

    this.input.oninput = (event: InputEvent) => {
      const value = (event.target instanceof HTMLInputElement) ? event.target.value : '';

      if (value && !filled) {
        this.element.className = `input${focused ? ' focused' : ''} filled`;
        filled = true;
      }

      if (!value && filled) {
        this.element.className = `input${focused ? ' focused' : ''}`;
        filled = false;
      }

      if (onChange) onChange(value);
    };

    if (ref) ref(this.input);
    if (onKeyDown) this.input.onkeydown = onKeyDown;
  }
}

export const textInput = ComponentFactory(TextInput);
