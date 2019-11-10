import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { div, input, text } from 'core/html';
import { listen } from 'core/dom';
import { useInterface, useMaybeObservable, useObservable } from 'core/hooks';
import { MaybeObservable } from 'core/types';
import './phone_input.scss';

type Props = {
  onChange?: (value: string) => any;
  prefix?: MaybeObservable<string>,
  formats?: MaybeObservable<Array<string | number> | undefined>,
  label?: string,
  name?: string,
  ref?: (ref: HTMLInputElement) => any,
  error?: Observable<string | undefined>,
};

/**
 * Phone input element with autoformatter
 *
 * @example
 * phoneInput({ label: 'Phone', prefix: '+44', formats: [9, 'dddd ddddd', 10, 'ddd ddd dddd'] })
 */
export default function phoneInput({ label = '', prefix = '', formats = [], onChange, ref, name, error }: Props) {
  const labelText = new BehaviorSubject(label);
  const inputEl = input({ type: 'tel', name });
  const element = div`.phoneinput`(
    div`.phoneinput__container`(
      div`.phoneinput__prefix`(text(prefix)),
      inputEl,
      div`.phoneinput__label`(text(labelText)),
    ),
  );

  let currentFormat: Array<string | number> | undefined;

  const format = (str: string): string => {
    if (!str || !currentFormat) return '';

    let formated = '';
    let maxLength = 0;

    for (let i = 0; i < currentFormat.length; i += 2) {
      maxLength = currentFormat[i] as number;

      if (typeof currentFormat[i] === 'number' && str.length <= currentFormat[i]) {
        const pattern = currentFormat[i + 1] as string;
        const literals = [' ', '-'];
        let offset = 0;
        let len = 0;

        for (let j = 0; j < pattern.length && offset + len < str.length; j++) {
          if (literals.indexOf(pattern[j]) === -1) {
            len++;
            continue;
          }

          formated += str.slice(offset, offset + len);
          formated += pattern[j];
          offset += len;
          len = 0;
        }

        return formated + str.slice(offset);
      }
    }

    return format(str.slice(0, maxLength));
  };

  const unformat = (str: string) => str.replace(/[^\d]/g, '');

  const getValue = () => unformat(inputEl.value);
  const setValue = (v: string) => { inputEl.value = format(v); };

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
