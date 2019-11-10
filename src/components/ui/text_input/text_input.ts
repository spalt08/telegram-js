import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { div, input, text } from 'core/html';
import { listen } from 'core/dom';
import { useObservable } from 'core/hooks';
import './text_input.scss';

type Props = {
  label?: string,
  name?: string,
  autocomplete?: string,
  ref?: (ref: HTMLInputElement) => void,
  error?: Observable<string | undefined>,
  onChange?(value: string): void;
};

/**
 * Basic text input element
 *
 * @example
 * textInput({ label: 'Name' })
 */
export default function textInput({ label = '', ref, autocomplete, name, error, onChange }: Props) {
  const labelText = new BehaviorSubject(label);
  const inputEl = input({ type: 'text', name, autocomplete });
  const labelEl = div`.input__label`(text(labelText));
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

    if (onChange) onChange(value);
  });

  if (error) {
    const hasError = error.pipe(map((message) => message !== undefined));
    useObservable(element, hasError, (isError) => { element.classList[isError ? 'add' : 'remove']('error'); });
    useObservable(element, error, (errorMessage) => labelText.next(errorMessage === undefined ? label : errorMessage));
  }

  if (ref) ref(inputEl);

  return element;
}
