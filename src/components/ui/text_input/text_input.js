// @flow

import Component from 'core/component';
import { div } from 'core/html_raw';
import { useMutation } from 'core/mutation';
import './text_input.scss';

type Props = {
  onChange: (value: string) => any;
  placeholder: string,
};

class TextInput extends Component<HTMLDivElement> {
  label: HTMLDivElement;
  input: HTMLInputElement;

  constructor({ placeholder = '', onChange = () => {} }: Props) {
    super();

    this.ref = div`.input`;
    this.label = div`.input__label`;
    this.input = document.createElement('input');

    this.input.setAttribute('type', 'text');
    this.label.appendChild(document.createTextNode(placeholder));

    this.ref.appendChild(this.input);
    this.ref.appendChild(this.label);

    const value = useMutation('');

    value.subscribe(text => { console.log(text); this.ref.className = text ? 'input filled' : 'input' });

    this.label.onclick = () => this.input.focus();

    this.ref.oninput = (event: Event) => {
      value.update(event.target.value);
      onChange(event.target.value);
    }
  }
}

export default (props: Props) => () => new TextInput(props);
