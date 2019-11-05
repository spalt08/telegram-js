// @flow

import Component from 'core/component';
import { div } from 'core/html';
import { mount, unmount, setValue } from 'core/dom';
import TextInput from '../text_input/text_input';
import './select_autocomplete.scss';

type Props = {
  label?: string,
  options?: Array<any>,
  onChange?: (value: string) => any;
};

class SelectAutoComplete extends Component<HTMLDivElement> {
  input: HTMLDivElement;

  optionsEl: HTMLDivElement;

  options: Array<any>;

  hideTimeout: number;

  query: string;

  selected: any;

  constructor({ label = '', options = [] }: Props) {
    super();

    this.options = options;

    this.ref = div`.select`(
      TextInput({
        label,
        onFocus: this.handleFocus,
        onBlur: this.handleBlur,
        onChange: this.handleTyping,
        ref: (el) => { this.input = el; },
      }),
      div`.select__arrow`({ onClick: this.handleArrowClick }),
    )();

    this.optionsEl = div`.select__options`(
      ...this.options.map((text) => div`.select__option`({ key: text, onClick: this.handleSelect })(text)),
    )();
  }

  handleTyping = (query: string) => {
    if (!this.query && query) {
      this.ref.className = 'select focused filled';
    }

    if (this.query && !query) {
      this.ref.className = 'select focused';
    }

    this.query = query.toLowerCase();
    this.fetchOptions();
  }

  handleFocus = () => {
    if (this.hideTimeout) clearTimeout(this.hideTimeout);

    this.ref.className = `select focused${this.query ? ' filled' : ''}`;

    mount(this.ref, this.optionsEl);

    this.fetchOptions();
  }

  handleBlur = () => {
    this.ref.className = `select${this.query ? ' filled' : ''}`;

    if (this.optionsEl) {
      this.hideTimeout = setTimeout(() => unmount(this.optionsEl), 100);
    }
  }

  handleSelect = (event: MouseEvent) => {
    setValue(this.input, event.target.__key);
    this.ref.className = `select${this.query ? ' filled' : ''}`;
  }

  handleArrowClick = () => {
    if (this.query) {
      setValue(this.input, '');
      this.input.focus();
    }

    if (!this.optionsEl.parentNode) {
      this.input.focus();
    }
  }

  fetchOptions = () => {
    for (let i = 0; i < this.optionsEl.childNodes.length; i++) {
      const node = this.optionsEl.childNodes[i];
      if (!this.query || node.textContent.toLowerCase().indexOf(this.query) > -1) {
        node.style.display = '';
      } else {
        node.style.display = 'none';
      }
    }
  }
}

export default (props: Props) => () => new SelectAutoComplete(props);
