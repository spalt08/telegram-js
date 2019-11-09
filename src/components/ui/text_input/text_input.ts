import { div, input, text } from 'core/html';
import { listen } from 'core/dom';
import './text_input.scss';

type Props = {
  label?: string,
  name?: string,
  autocomplete?: string,
  ref?: (ref: HTMLInputElement) => void,
};

/**
 * Basic text input element
 *
 * @example
 * textInput({ label: 'Name' })
 */
export default function textInput({ label = '', ref, autocomplete, name }: Props) {
  const inputEl = input({ type: 'text', name, autocomplete });
  const labelEl = div`.input__label`(text(label));
  const element = div`.input`(inputEl, labelEl);

  let filled = false;

  listen(inputEl, 'focus', () => {
    element.classList.add('focused');
  });

  listen(inputEl, 'blur', () => {
    element.classList.remove('focused');
  });

  listen(inputEl, 'input', (event: Event) => {
    const value = (event.target instanceof HTMLInputElement) ? event.target.value : '';

    if (value && !filled) {
      element.classList.add('filled');
      filled = true;
    }

    if (!value && filled) {
      element.classList.remove('filled');
      filled = false;
    }
  });

  if (ref) ref(inputEl);

  return element;
}
