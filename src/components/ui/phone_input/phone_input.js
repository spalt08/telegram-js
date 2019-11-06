// @flow

import Component from 'core/component';
import { ComponentFactory } from 'core/factory';
import { div, input } from 'core/html';
import { Mutatable } from 'core/mutation';
import './phone_input.scss';

type Props = {
  onChange?: (value: string) => any;
  prefix?: string,
  formats?: Array<string | number>,
  label?: string,
  name?: string,
  ref?: (HTMLInputElement) => any,
};

export class PhoneInput extends Component<HTMLDivElement> {
  input: HTMLInputElement;

  value: string;

  formats: Array<string | number>;

  constructor({ label = '', prefix = '', formats = {}, onChange, ref, name }: Props) {
    super();

    this.ref = new div`.phoneinput`(
      div`.phoneinput__container`(
        div`.phoneinput__prefix`(prefix),
        this.input = new input({ type: 'text', name, autocomplete: 'off' }),
        div`.phoneinput__label`(label),
      ),
    );

    this.input.onfocus = () => {
      this.ref.className = 'phoneinput focused';
    };

    this.input.onblur = () => {
      this.ref.className = 'phoneinput';
    };

    if (formats instanceof Mutatable) {
      formats.subscribe((f) => { this.formats = f; });
    } else {
      this.formats = formats;
    }

    this.value = '';

    this.input.oninput = (event: InputEvent) => {
      const inputed = (event.target instanceof HTMLInputElement) ? event.target.value : '';

      this.value = this.unformat(inputed);

      if (onChange) onChange(this.value);

      this.input.value = this.format(this.value);
    };

    if (ref) ref(this.input);
  }

  format = (str: string) => {
    if (!str) return '';
    if (!this.formats) return str;

    let formated = '';
    let maxLength = 0;

    for (let i = 0; i < this.formats.length; i += 2) {
      maxLength = (this.formats[i]: any);

      if (typeof this.formats[i] === 'number' && str.length <= this.formats[i]) {
        const pattern: string = (this.formats[i + 1]: any);
        const literals = [' ', '-'];
        let offset = 0;
        let len = 0;

        for (let j = 0; j < pattern.length && offset + len < str.length; j++) {
          if (literals.indexOf(pattern[j]) === -1) {
            len++;
            continue;
          }

          formated += str.slice(offset, offset + len);
          formated += pattern[j];
          offset += len;
          len = 0;
        }

        return formated + str.slice(offset);
      }
    }

    return this.format(str.slice(0, maxLength));
  };

  // To Do: fix replacement
  unformat = (str: string) => str.replace(' ', '').replace(' ', '').replace('-', '').replace('-', '');
}

export const phoneInput = ComponentFactory(PhoneInput);
