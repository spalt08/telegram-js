// @flow

import Component from 'core/component';
import { ComponentFactory } from 'core/factory';
import { div } from 'core/html';
import { mount, unmount, setValue, getAttribute } from 'core/dom';
import { KEYBOARD } from 'const';
import { textInput } from '../text_input/text_input';
import './select_autocomplete.scss';

type Props = {
  label?: string,
  options?: Array<any>,
  onChange?: (value: string) => any;
};

/**
 * Select with autocomplete
 * @extends Component HTMLDivElement
 *
 * Usage examples:
 * - SelectAutoComplete({ label: 'Select Fruit', options: ['Orange', 'Apple', 'Pineapple']})
 * - selectAutoComplete({ options: [{ id: 1, text: 'Orange' }], optionRenderer: (data) => div(data.text) })
 */
export class SelectAutoComplete extends Component<HTMLDivElement> {
  input: HTMLDivElement;

  optionsEl: HTMLDivElement;

  options: Array<any>;

  query: string;

  selected: number;

  highlighted: number = -1;

  constructor({ label = '', options = [] }: Props) {
    super();

    this.options = options;

    this.ref = new div`.select`(
      textInput({
        label,
        onFocus: this.handleFocus,
        onKeyDown: this.handleKeyDown,
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
      ...this.options.map((text, key) => div`.select__option`({ key, onClick: this.handleSelect, onMouseEnter: this.handleMouseEnter })(text)),
    );
  }

  handleTyping = (query: string) => {
    this.handleHighlight(-1);
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

    if (this.optionsEl.parentNode !== this.ref) {
      mount(this.ref, this.optionsEl);
      if (this.selected) this.handleHighlight(this.selected);
    }

    this.fetchOptions();
  }

  handleBlur = () => {
    this.ref.className = `select${this.query ? ' filled' : ''}`;

    if (this.optionsEl) {
      unmount(this.optionsEl);
    }

    this.input.blur();
  }

  handleSelect = (event: MouseEvent) => {
    this.setSelected(parseInt(getAttribute(event.currentTarget, 'data-key'), 10));
  }

  setSelected = (key: number) => {
    this.selected = key === -1 ? 0 : key;
    setValue(this.input, this.options[this.selected]);
    this.handleBlur();
  }

  handleArrowClick = () => {
    if (this.query) {
      setValue(this.input, '');
      this.input.focus();
      return;
    }

    if (!this.optionsEl.parentNode) {
      this.input.focus();
    } else {
      this.handleBlur();
    }
  }

  handleHighlight = (index: number) => {
    if (this.highlighted > -1) {
      const el = this.optionsEl.childNodes[this.highlighted];
      el.className = el.className.replace(' active', '');
    }

    if (index >= this.options.length) {
      this.highlighted = 0;
    } else if (index <= -2) {
      this.highlighted = this.options.length - 1;
    } else {
      this.highlighted = index;
    }

    if (this.highlighted > -1) {
      this.optionsEl.childNodes[this.highlighted].className += ' active';
    }
  }

  handleMouseEnter = (event: Event) => {
    if (event.currentTarget instanceof HTMLDivElement) {
      this.handleHighlight(parseInt(getAttribute(event.currentTarget, 'data-key'), 10));
    }
  }

  handleKeyDown = (event: KeyboardEvent) => {
    switch (event.keyCode) {
      case KEYBOARD.TAB:
        this.handleBlur();
        break;

      case KEYBOARD.ARROW_DOWN:
        this.handleHighlight(this.highlighted + 1);
        break;

      case KEYBOARD.ARROW_UP:
        this.handleHighlight(this.highlighted === 0 ? this.highlighted - 2 : this.highlighted - 1);
        break;

      case KEYBOARD.ENTER:
        this.setSelected(this.highlighted);
        break;

      case KEYBOARD.ESC:
        this.handleArrowClick();
        break;

      default:
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
