// @flow

import Component from 'core/component';
import { div, input } from 'core/html';
import { useMutation } from 'core/mutation';
import './text_input.scss';

type Props = {
  onChange?: (value: string) => any;
  placeholder?: string,
};

class TextInput extends Component<HTMLDivElement> {
  label: HTMLDivElement;
  input: HTMLInputElement;

  constructor({ placeholder = '', onChange = () => {} }: Props) {
    super();

    this.ref = div`.input`(
      this.input = input({ type: "text" }),
      this.label = div`.input__label`(placeholder)(),
    )();

    let filled = false;

    this.label.onclick = () => this.input.focus();
    this.ref.oninput = (event: InputEvent) => {
      const value = (event.target instanceof HTMLInputElement) ? event.target.value : '';

      if (value && !filled) {
        this.ref.className = 'input filled';
        filled = true;
      } 

      if(!value && filled) {
        this.ref.className = 'input';
        filled = false;
      }

      onChange(value);
    }
  }
}

export default (props: Props) => () => new TextInput(props);
