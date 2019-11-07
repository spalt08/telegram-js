import { div, input } from 'core/html';
import './text_input.scss';

type Props = {
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (_event: KeyboardEvent) => void;
  label?: string,
  name?: string,
  autocomplete?: string,
  ref?: (ref: HTMLInputElement) => void,
};

export default function textInput({ label = '', onChange, onFocus, onBlur, ref, autocomplete, onKeyDown, name }: Props) {
  const inputEl = input({ type: 'text', name, autocomplete });
  const labelEl = div`.input__label`(label);
  const element = div`.input`(inputEl, labelEl);

  let filled = false;
  let focused = false;

  inputEl.onfocus = () => {
    if (onFocus) onFocus();
    focused = true;
    element.className = `input focused${filled ? ' filled' : ''}`;
  };

  inputEl.onblur = () => {
    if (onBlur) onBlur();
    focused = false;
    element.className = `input${filled ? ' filled' : ''}`;
  };

  inputEl.oninput = (event: Event) => {
    const value = (event.target instanceof HTMLInputElement) ? event.target.value : '';

    if (value && !filled) {
      element.className = `input${focused ? ' focused' : ''} filled`;
      filled = true;
    }

    if (!value && filled) {
      element.className = `input${focused ? ' focused' : ''}`;
      filled = false;
    }

    if (onChange) onChange(value);
  };

  if (ref) ref(inputEl);
  if (onKeyDown) inputEl.onkeydown = onKeyDown;

  return element;
}
