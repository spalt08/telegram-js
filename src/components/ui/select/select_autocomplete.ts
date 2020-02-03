/* eslint-disable no-param-reassign */
import { div, text as textNode } from 'core/html';
import { mount, unmount, listen, dispatch, setValue, isMounted } from 'core/dom';
import { useInterface, useToBehaviorSubject, useOutsideEvent } from 'core/hooks';
import { MaybeObservable } from 'core/types';
import { KeyboardKeys } from 'const'; // eslint-disable-line import/named
import textInput from '../text_input/text_input';
import './select_autocomplete.scss';
import { modulo } from '../../../helpers/data';

type Props<T> = {
  label?: string,
  name?: string,
  selected: number,
  options?: T[],
  disabled?: MaybeObservable<boolean>,
  optionRenderer?(data: T): Node,
  optionLabeler?(data: T): string,
  onChange?(data: T): void,
};

/**
 * Select with autocomplete
 *
 * @example
 * selectAutoComplete({ label: 'Select Fruit', options: ['Orange', 'Apple', 'Pineapple']})
 * selectAutoComplete({ options: [{ id: 1, text: 'Orange' }], optionRenderer: data => div`.option`(data.text), optionLabeler: data => data.text })
 */
export default function selectAutoComplete<T>({
  label = '',
  name = '',
  selected: _selected,
  options = [],
  disabled = false,
  optionRenderer = (text: T) => textNode(typeof text === 'string' ? text : ''),
  optionLabeler = (text: T) => (typeof text === 'string' ? text : ''),
  onChange,
}: Props<T>) {
  let query = '';
  let selected = _selected;
  let highlighted = -1;
  let inputEl: HTMLInputElement;

  const arrow = div`.select__arrow`();
  const element = div`.select`(
    textInput({
      label,
      name,
      autocomplete: 'off',
      disabled,
      inputClassName: 'select__input',
      ref: (el: HTMLInputElement) => { inputEl = el; },
    }),
    arrow,
  );

  const optionsEl = div`.select__options`(
    ...options.map((data) => (
      div`.select__option`(
        optionRenderer(data),
      )
    )),
  );

  const [disabledSubject] = useToBehaviorSubject(element, disabled, false);

  const performBlur = () => {
    setValue(inputEl, optionLabeler(options[selected]));
    element.classList.remove('focused');
    unmount(optionsEl);
    inputEl.blur();
  };

  const handleHighlight = (index: number, scrollTo = false) => {
    if (highlighted === index) return;
    if (highlighted > -1) {
      optionsEl.children[highlighted].classList.remove('active');
    }
    if (index >= 0 && index < options.length) {
      highlighted = index;
      const highlightedElement = optionsEl.children[index];
      highlightedElement.classList.add('active');
      if (scrollTo) {
        highlightedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    } else {
      highlighted = -1;
    }
  };

  const getNextVisibleOption = (targetIndex: number, direction: Exclude<number, 0>): number => {
    const step = direction > 0 ? 1 : -1;
    const optionsCount = optionsEl.children.length;
    for (let i = 0; i < optionsCount; i++) {
      const index = modulo(targetIndex + step * (i + 1), optionsCount);
      const option = optionsEl.children[index] as HTMLElement;
      if (option.style.display !== 'none') {
        return index;
      }
    }
    return -1;
  };

  const filterOptions = (highlight: boolean = false) => {
    for (let i = 0; i < optionsEl.children.length; i++) {
      const option = optionsEl.children[i] as HTMLElement;
      if (!query || option.textContent!.toLowerCase().indexOf(query) > -1) {
        option.style.display = '';
      } else {
        option.style.display = 'none';
      }
    }

    if (highlight) {
      handleHighlight(getNextVisibleOption(-1, 1));
    }
  };

  const setSelected = (index: number) => {
    selected = index === -1 ? 0 : index;
    performBlur();

    if (onChange) onChange(options[selected]);
  };

  listen(inputEl!, 'input', (event: Event) => {
    const q = event.currentTarget instanceof HTMLInputElement ? event.currentTarget.value : '';

    if (!query && q) element.classList.add('filled');
    if (query && !q) element.classList.remove('filled');

    query = q.trim().toLowerCase();
    filterOptions(true);
  });

  listen(inputEl!, 'focus', () => {
    setValue(inputEl, '');
    element.classList.add('focused');
    if (!isMounted(optionsEl)) {
      mount(element, optionsEl);
      if (selected) handleHighlight(selected);
    }
    filterOptions();
  });

  listen(arrow, 'click', () => {
    if (disabledSubject.value) return;

    if (query) {
      setValue(inputEl, '');
      inputEl.focus();
      return;
    }

    if (!optionsEl.parentNode) inputEl.focus();
    else performBlur();
  });

  listen(inputEl!, 'keydown', (event: KeyboardEvent) => {
    switch (event.keyCode) {
      case KeyboardKeys.TAB:
        // todo: Shift tabs
        event.preventDefault();
        setSelected(highlighted);
        performBlur();
        break;

      case KeyboardKeys.ARROW_DOWN:
        handleHighlight(getNextVisibleOption(highlighted, 1), true);
        break;

      case KeyboardKeys.ARROW_UP:
        handleHighlight(getNextVisibleOption(highlighted, -1), true);
        break;

      case KeyboardKeys.ENTER:
        event.preventDefault();
        setSelected(highlighted);
        break;

      case KeyboardKeys.ESC:
        event.preventDefault();
        dispatch(arrow, 'click');
        break;

      default:
    }
  });

  for (let i = 0; i < optionsEl.childNodes.length; i++) {
    listen(optionsEl.childNodes[i], 'click', () => setSelected(i));
    listen(optionsEl.childNodes[i], 'mousemove', () => handleHighlight(i));
  }

  if (selected !== undefined) setSelected(selected);

  useOutsideEvent(element, 'click', performBlur);

  return useInterface(element, {
    getValue(): T {
      return options[selected];
    },
  });
}
