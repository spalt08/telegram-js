// @flow

import Component from 'core/component';
import { ComponentFactory } from 'core/factory';
import { div } from 'core/html';
import { mount, unmount, setValue, getAttribute } from 'core/dom';
import { textInput } from '../text_input/text_input';
import './select_autocomplete.scss';

type Props = {
  label?: string,
  options?: Array<any>,
  onChange?: (value: string) => any;
};

export class SelectAutoComplete extends Component<HTMLDivElement> {
  input: HTMLDivElement;

  optionsEl: HTMLDivElement;

  options: Array<any>;

  query: string;

  selected: any;

  constructor({ label = '', options = [] }: Props) {
    super();

    this.options = options;

    this.ref = new div`.select`(
      textInput({
        label,
        onFocus: this.handleFocus,
        onChange: this.handleTyping,
        ref: (el) => { this.input = el; },
      }),
      div`.select__arrow`({ onClick: this.handleArrowClick }),
    );

    // To Do wrapper for click outside event
    window.addEventListener('click', (event) => {
      if (!this.ref.contains(event.target)) {
        this.handleBlur();
      }
    });

    this.optionsEl = new div`.select__options`(
      ...this.options.map((text) => div`.select__option`({ key: text, onClick: this.handleSelect })(text)),
    );
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
    this.ref.className = `select focused${this.query ? ' filled' : ''}`;

    mount(this.ref, this.optionsEl);

    this.fetchOptions();
  }

  handleBlur = () => {
    this.ref.className = `select${this.query ? ' filled' : ''}`;

    if (this.optionsEl) {
      unmount(this.optionsEl);
    }
  }

  handleSelect = (event: MouseEvent) => {
    setValue(this.input, getAttribute(event.currentTarget, 'data-key'));
    this.handleBlur();
  }

  handleArrowClick = () => {
    if (this.query) {
      setValue(this.input, '');
      this.handleFocus();
    }

    if (!this.optionsEl.parentNode) {
      this.input.focus();
    } else {
      this.handleBlur();
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

export const selectAutoComplete = ComponentFactory(SelectAutoComplete);
