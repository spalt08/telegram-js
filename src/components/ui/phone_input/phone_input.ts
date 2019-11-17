import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { div, input, text } from 'core/html';
import { listen } from 'core/dom';
import { useInterface, useMaybeObservable, useObservable } from 'core/hooks';
import { MaybeObservable } from 'core/types';
import { format, unformat } from 'helpers/phone';
import './phone_input.scss';

type Props = {
  onChange?: (value: string) => any;
  prefix?: MaybeObservable<string>,
  formats?: MaybeObservable<Array<string | number> | undefined>,
  label?: string,
  name?: string,
  ref?: (ref: HTMLInputElement) => any,
  error?: Observable<string | undefined>,
  disabled?: MaybeObservable<boolean>,
};

/**
 * Phone input element with autoformatter
 *
 * @example
 * phoneInput({ label: 'Phone', prefix: '+44', formats: [9, 'dddd ddddd', 10, 'ddd ddd dddd'] })
 */
export default function phoneInput({ label = '', prefix = '', formats = [], onChange, ref, name, error, disabled }: Props) {
  const labelText = new BehaviorSubject(label);

  const inputEl = input({ type: 'tel', name, disabled, autocomplete: 'tel' });

  const element = div`.phoneinput`(
    div`.phoneinput__container`(
      div`.phoneinput__prefix`(text(prefix)),
      inputEl,
      div`.phoneinput__label`(text(labelText)),
    ),
  );

  let currentFormat: Array<string | number> | undefined;

  const getValue = () => unformat(inputEl.value);
  const setValue = (v: string) => { inputEl.value = currentFormat ? format(currentFormat, v) : v; };

  useMaybeObservable(element, formats, (newFormat) => {
    currentFormat = newFormat;
    setValue(getValue());
  });

  if (error) {
    const hasError = error.pipe(map((message) => message !== undefined));
    useObservable(element, hasError, (isError) => { element.classList[isError ? 'add' : 'remove']('error'); });
    useObservable(element, error, (errorMessage) => labelText.next(errorMessage === undefined ? label : errorMessage));
  }

  listen(inputEl, 'focus', () => element.classList.add('focused'));
  listen(inputEl, 'blur', () => element.classList.remove('focused'));
  listen(inputEl, 'input', () => {
    const value = getValue();
    setValue(value);
    if (onChange) onChange(value);
  });

  if (ref) ref(inputEl);

  return useInterface(element, {
    focus() {
      inputEl.focus();
    },
    blur() {
      inputEl.blur();
    },
    getValue,
    setValue,
  });
}
