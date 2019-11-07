import { div, input, text } from 'core/html';
import { listen } from 'core/dom';
import './text_input.scss';

type Props = {
  label?: string,
  name?: string,
  autocomplete?: string,
  ref?: (ref: HTMLInputElement) => void,
};

export default function textInput({ label = '', ref, autocomplete, name }: Props) {
  const inputEl = input({ type: 'text', name, autocomplete });
  const labelEl = div`.input__label`(text(label));
  const element = div`.input`(inputEl, labelEl);

  let filled = false;
  let focused = false;

  listen(inputEl, 'focus', () => {
    focused = true;
    element.className = `input focused${filled ? ' filled' : ''}`;
  });

  listen(inputEl, 'blur', () => {
    focused = false;
    element.className = `input${filled ? ' filled' : ''}`;
  });

  listen(inputEl, 'input', (event: Event) => {
    const value = (event.target instanceof HTMLInputElement) ? event.target.value : '';

    if (value && !filled) {
      element.className = `input${focused ? ' focused' : ''} filled`;
      filled = true;
    }

    if (!value && filled) {
      element.className = `input${focused ? ' focused' : ''}`;
      filled = false;
    }
  });

  if (ref) ref(inputEl);

  return element;
}
