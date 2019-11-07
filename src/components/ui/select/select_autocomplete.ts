/* eslint-disable no-param-reassign */
import { div } from 'core/html';
import { mount, unmount, setValue, getAttribute } from 'core/dom';
import { KEYBOARD } from 'const';
import textInput from '../text_input/text_input';
import './select_autocomplete.scss';

type Props<T> = {
  label?: string,
  name?: string,
  selected: number,
  options?: T[],
  optionRenderer?: (data: T) => HTMLElement | string,
  optionLabeler?: (data: T) => HTMLElement | string,
  onChange?: (data: T) => void,
};

/**
 * Select with autocomplete
 * @extends Component HTMLDivElement
 *
 * Usage examples:
 * - selectAutoComplete({ label: 'Select Fruit', options: ['Orange', 'Apple', 'Pineapple']})
 * - selectAutoComplete({ options: [{ id: 1, text: 'Orange' }], optionRenderer: (data) => div(data.text) })
 */
export default function selectAutoComplete<T>({
  label = '',
  name = '',
  selected,
  options = [],
  optionRenderer = (text: T) => (typeof text === 'string' && text) || '',
  optionLabeler = (text: T) => (typeof text === 'string' && text) || '',
  onChange,
}: Props<T>) {
  let query = '';
  let highlighted = -1;
  let inputEl: HTMLInputElement;

  let handleTyping = (_q: string) => {};
  let handleBlur = () => {};
  let handleFocus = () => {};
  let handleKeyDown = (_event: KeyboardEvent) => {};
  let handleArrowClick = () => {};
  let handleSelect = (_event: MouseEvent) => {};
  let handleMouseEnter = (_event: Event) => {};
  let handleHighlight = (_index: number) => {};
  let setSelected = (_index: number) => {};
  let fetchOptions = (_highlight?: boolean) => {};

  const element = div`.select`(
    textInput({
      label,
      name,
      autocomplete: 'off',
      onFocus: handleFocus,
      onKeyDown: handleKeyDown,
      onChange: handleTyping,
      ref: (el: HTMLInputElement) => { inputEl = el; },
    }),
    div`.select__arrow`({ onClick: handleArrowClick }),
  );

  const optionsEl = div`.select__options`(
    ...options.map((data: T, key: number) => (
      div`.select__option`({ key, onClick: handleSelect, onMouseEnter: handleMouseEnter },
        optionRenderer(data),
      )
    )),
  );

  if (selected !== undefined) setSelected(selected);

  // To Do: wrapper for click outside event
  window.addEventListener('click', (event) => {
    if (!element.contains(event.target as HTMLElement)) {
      handleBlur();
    }
  });

  handleTyping = (q: string) => {
    if (!query && q) element.className = 'select focused filled';
    if (query && !q) element.className = 'select focused';

    query = q.toLowerCase();
    fetchOptions(true);
  };

  handleFocus = () => {
    element.className = `select focused${query ? ' filled' : ''}`;
    if (optionsEl.parentNode !== element) {
      mount(element, optionsEl);
      if (selected) handleHighlight(selected);
    }
    fetchOptions();
  };

  handleBlur = () => {
    element.className = `select${query ? ' filled' : ''}`;
    unmount(optionsEl);
    inputEl.blur();
  };

  handleSelect = (event: MouseEvent) => event.currentTarget instanceof HTMLDivElement
    && setSelected(parseInt(getAttribute(event.currentTarget, 'data-key'), 10));

  setSelected = (key: number) => {
    selected = key === -1 ? 0 : key;
    setValue(inputEl, optionLabeler(options[selected]));
    handleBlur();

    if (onChange) onChange(options[selected]);
  };

  handleArrowClick = () => {
    if (query) {
      setValue(inputEl, '');
      inputEl.focus();
      return;
    }

    if (!optionsEl.parentNode) {
      inputEl.focus();
    } else {
      handleBlur();
    }
  };

  handleHighlight = (index: number) => {
    if (highlighted === index) return;

    if (highlighted > -1) {
      (optionsEl.childNodes[highlighted] as HTMLElement).className = (
        (optionsEl.childNodes[highlighted] as HTMLElement).className.replace(' active', '')
      );
    }

    if (index >= options.length) {
      highlighted = 0;
    } else if (index <= -1) {
      highlighted = options.length - 1;
    } else {
      highlighted = index;
    }

    if (highlighted > -1) {
      (optionsEl.childNodes[highlighted] as HTMLElement).className += ' active';
    }
  };

  handleMouseEnter = (event: Event) => event.currentTarget instanceof HTMLDivElement
    && handleHighlight(parseInt(getAttribute(event.currentTarget, 'data-key'), 10));

  handleKeyDown = (event: KeyboardEvent) => {
    switch (event.keyCode) {
      case KEYBOARD.TAB:
        // To Do: shift tabs
        event.preventDefault();
        setSelected(highlighted);
        handleBlur();
        break;

      case KEYBOARD.ARROW_DOWN:
        handleHighlight(highlighted + 1);
        break;

      case KEYBOARD.ARROW_UP:
        handleHighlight(highlighted - 1);
        break;

      case KEYBOARD.ENTER:
        event.preventDefault();
        setSelected(highlighted);
        break;

      case KEYBOARD.ESC:
        handleArrowClick();
        break;

      default:
    }
  };

  fetchOptions = (highlight: boolean = false) => {
    let first = -1;

    for (let i = 0; i < optionsEl.childNodes.length; i++) {
      const node = optionsEl.childNodes[i] as HTMLElement;

      if (!query || node.textContent!.toLowerCase().indexOf(query) > -1) {
        node.style.display = '';

        if (first === -1) first = i;
      } else {
        node.style.display = 'none';
      }
    }

    if (highlight) handleHighlight(first);
  };

  return element;
}
