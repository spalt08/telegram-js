// @flow

import Component from 'core/component';
import { div, input } from 'core/html';
import './text_input.scss';

type Props = {
  onChange?: (value: string) => any;
  onFocus?: () => any;
  onBlur?: () => any;
  label?: string,
};

class TextInput extends Component<HTMLDivElement> {
  label: HTMLDivElement;

  input: HTMLInputElement;

  constructor({ label = '', onChange, onFocus, onBlur }: Props) {
    super();

    this.ref = div`.input`(
      this.input = new input({ type: 'text' }),
      this.label = div`.input__label`(label)(),
    )();

    let filled = false;

    this.label.onclick = () => { this.input.focus(); };
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
  }
}

export default (props: Props) => () => new TextInput(props);
