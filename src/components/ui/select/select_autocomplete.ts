import { ComponentFactory } from 'core/factory';
import { div } from 'core/html';
import { Component, mount, unmount, setValue, getAttribute } from 'core/dom';
import { KEYBOARD } from 'const';
import { textInput } from '../text_input/text_input';
import './select_autocomplete.scss';

type Props = {
  label?: string,
  name?: string,
  selected: number,
  options?: any[],
  optionRenderer?: (data: any) => any,
  optionLabeler?: (data: any) => any,
  onChange?: (data: any) => any,
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
  input: HTMLDivElement | undefined;

  optionsEl: HTMLDivElement;

  options: any[];

  optionLabeler: (data: any) => string;

  query: string;

  selected: number;

  highlighted: number = -1;

  changeCallback: undefined | ((data: any) => any);

  constructor({
    label = '',
    name = '',
    selected,
    options = [],
    optionRenderer = (text: string) => text,
    optionLabeler = (text: string) => text,
    onChange,
  }: Props) {
    super();

    this.query = '';
    this.selected = selected;
    this.options = options;
    this.optionLabeler = optionLabeler;
    this.changeCallback = onChange;

    this.element = new div`.select`(
      textInput({
        label,
        name,
        autocomplete: 'off',
        onFocus: this.handleFocus,
        onKeyDown: this.handleKeyDown,
        onChange: this.handleTyping,
        ref: (el: HTMLDivElement) => { this.input = el; },
      }),
      div`.select__arrow`({ onClick: this.handleArrowClick }),
    );

    // To Do wrapper for click outside event
    window.addEventListener('click', (event) => {
      if (!this.element.contains(event.target as HTMLElement)) {
        this.handleBlur();
      }
    });

    this.optionsEl = new div`.select__options`(
      ...this.options.map((data, key) => div`.select__option`({ key, onClick: this.handleSelect, onMouseEnter: this.handleMouseEnter })(
        optionRenderer(data),
      )),
    );

    if (selected !== undefined) this.setSelected(selected);
  }

  handleTyping = (query: string) => {
    if (!this.query && query) {
      this.element.className = 'select focused filled';
    }

    if (this.query && !query) {
      this.element.className = 'select focused';
    }

    this.query = query.toLowerCase();
    this.fetchOptions(true);
  };

  handleFocus = () => {
    this.element.className = `select focused${this.query ? ' filled' : ''}`;

    if (this.optionsEl.parentNode !== this.element) {
      mount(this.element, this.optionsEl);
      if (this.selected) this.handleHighlight(this.selected);
    }

    this.fetchOptions();
  };

  handleBlur = () => {
    this.element.className = `select${this.query ? ' filled' : ''}`;

    if (this.optionsEl) {
      unmount(this.optionsEl);
    }

    this.input!.blur();
  };

  handleSelect = (event: MouseEvent) => {
    if (event.currentTarget instanceof HTMLDivElement) {
      this.setSelected(parseInt(getAttribute(event.currentTarget, 'data-key'), 10));
    }
  };

  setSelected = (key: number) => {
    this.selected = key === -1 ? 0 : key;
    setValue(this.input!, this.optionLabeler(this.options[this.selected]));
    this.handleBlur();

    if (this.changeCallback) this.changeCallback(this.options[this.selected]);
  };

  handleArrowClick = () => {
    if (this.query) {
      setValue(this.input!, '');
      this.input!.focus();
      return;
    }

    if (!this.optionsEl.parentNode) {
      this.input!.focus();
    } else {
      this.handleBlur();
    }
  };

  handleHighlight = (index: number) => {
    if (this.highlighted > -1) {
      (this.optionsEl.childNodes[this.highlighted] as HTMLElement).className.replace(' active', '');
    }

    if (index >= this.options.length) {
      this.highlighted = 0;
    } else if (index <= -1) {
      this.highlighted = this.options.length - 1;
    } else {
      this.highlighted = index;
    }

    if (this.highlighted > -1) {
      (this.optionsEl.childNodes[this.highlighted] as HTMLElement).className += ' active';
    }
  };

  handleMouseEnter = (event: Event) => {
    if (event.currentTarget instanceof HTMLDivElement) {
      this.handleHighlight(parseInt(getAttribute(event.currentTarget, 'data-key'), 10));
    }
  };

  handleKeyDown = (event: KeyboardEvent) => {
    switch (event.keyCode) {
      case KEYBOARD.TAB:
        // To Do: shift tab
        event.preventDefault();
        this.setSelected(this.highlighted);
        this.handleBlur();
        break;

      case KEYBOARD.ARROW_DOWN:
        this.handleHighlight(this.highlighted + 1);
        break;

      case KEYBOARD.ARROW_UP:
        this.handleHighlight(this.highlighted - 1);
        break;

      case KEYBOARD.ENTER:
        event.preventDefault();
        this.setSelected(this.highlighted);
        break;

      case KEYBOARD.ESC:
        this.handleArrowClick();
        break;

      default:
    }
  };

  fetchOptions = (highlight: boolean = false) => {
    let first = -1;

    for (let i = 0; i < this.optionsEl.childNodes.length; i++) {
      const node = this.optionsEl.childNodes[i] as HTMLElement;

      if (!this.query || node.textContent!.toLowerCase().indexOf(this.query) > -1) {
        node.style.display = '';

        if (first === -1) first = i;
      } else {
        node.style.display = 'none';
      }
    }

    if (highlight) this.handleHighlight(first);
  };
}

export const selectAutoComplete = ComponentFactory(SelectAutoComplete);
