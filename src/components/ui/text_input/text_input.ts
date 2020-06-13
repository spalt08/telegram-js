import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { div, input, text } from 'core/html';
import { listen } from 'core/dom';
import { useInterface, useObservable } from 'core/hooks';
import { MaybeObservable } from 'core/types';
import './text_input.scss';

export type Props = {
  label?: string,
  type?: MaybeObservable<HTMLInputElement['type']>,
  name?: MaybeObservable<string | undefined>,
  className?: string,
  inputClassName?: string,
  autocomplete?: string,
  ref?: (ref: HTMLInputElement) => void,
  error?: Observable<string | undefined>,
  disabled?: MaybeObservable<boolean>,
  maxLength?: number,
  onChange?(value: string): void;
  onFocus?(value?: string): void;
  onBlur?(value?: string): void;
};

/**
 * Basic text input element
 *
 * @example
 * textInput({ label: 'Name' })
 */
export default function textInput({
  label = '',
  ref,
  autocomplete,
  type = 'text',
  name,
  className = '',
  inputClassName = '',
  error,
  disabled,
  maxLength,
  onChange,
  onFocus,
  onBlur,
}: Props) {
  const labelText = new BehaviorSubject(label);
  const inputEl = input`${inputClassName}`({
    type,
    name,
    autocomplete,
    disabled,
    maxLength,
  });
  const labelEl = div`.input__label`(text(labelText));
  const element = div`.input ${className}`(inputEl, labelEl);

  let filled = false;

  listen(inputEl, 'focus', () => {
    element.classList.add('focused');
    if (onFocus) onFocus(inputEl.value);
  });

  listen(inputEl, 'blur', () => {
    element.classList.remove('focused');
    if (onBlur) onBlur(inputEl.value);
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
    useObservable(element, hasError, true, (isError) => element.classList.toggle('error', isError));
    useObservable(element, error, true, (errorMessage) => labelText.next(errorMessage === undefined ? label : errorMessage));
  }

  if (ref) ref(inputEl);

  return useInterface(element, {
    getValue() {
      return inputEl.value;
    },
  });
}
