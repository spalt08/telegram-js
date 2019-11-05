// @flow

import Component from 'core/component';
import { div } from 'core/html';
import { mount, unmount, setValue } from 'core/dom';
import { TextInput } from 'components/ui';
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
    )();

    this.optionsEl = div`.select__options`(
      ...this.options.map((text) => div`.select__option`({ key: text, onClick: this.handleSelect })(text)),
    )();
  }

  handleTyping = (query: string) => {
    this.query = query.toLowerCase();
    this.fetchOptions();
  }

  handleFocus = () => {
    if (this.hideTimeout) clearTimeout(this.hideTimeout);

    this.ref.className = 'select focused';

    mount(this.ref, this.optionsEl);

    this.fetchOptions();
  }

  handleBlur = () => {
    this.ref.className = 'select';

    if (this.optionsEl) {
      this.hideTimeout = setTimeout(() => unmount(this.optionsEl), 150);
    }
  }

  handleSelect = (event: MouseEvent) => {
    console.log('click', event.target.__key);
    console.log(this.input);
    setValue(this.input, event.target.__key);
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
