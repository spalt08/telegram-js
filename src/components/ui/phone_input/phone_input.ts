import { div, input, text } from 'core/html';
import { listen } from 'core/dom';
import { getMaybeMutatableValue, mapMutatable, MaybeMutatable, Mutatable, noRepeatMutatable } from 'core/mutation';
import { useInterface, useMaybeMutatable, useMutatable } from 'core/hooks';
import './phone_input.scss';

type Props = {
  onChange?: (value: string) => any;
  prefix?: MaybeMutatable<string>,
  formats?: MaybeMutatable<Array<string | number> | undefined>,
  label?: string,
  name?: string,
  ref?: (ref: HTMLInputElement) => any,
  error?: Mutatable<string | undefined>,
};

/**
 * Phone input element with autoformatter
 *
 * @example
 * phoneInput({ label: 'Phone', prefix: '+44', formats: [9, 'dddd ddddd', 10, 'ddd ddd dddd'] })
 */
export default function phoneInput({ label = '', prefix = '', formats = [], onChange, ref, name, error }: Props) {
  const labelText = new Mutatable(label);
  const inputEl = input({ type: 'text', name });
  const element = div`.phoneinput`(
    div`.phoneinput__container`(
      div`.phoneinput__prefix`(text(prefix)),
      inputEl,
      div`.phoneinput__label`(text(labelText)),
    ),
  );

  const format = (str: string): string => {
    if (!str) return '';

    let formated = '';
    let maxLength = 0;
    const formatsVal = getMaybeMutatableValue(formats);

    if (!formatsVal) return str;

    for (let i = 0; i < formatsVal.length; i += 2) {
      maxLength = formatsVal[i] as number;

      if (typeof formatsVal[i] === 'number' && str.length <= formatsVal[i]) {
        const pattern = formatsVal[i + 1] as string;
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

  // todo: fix replacement
  const unformat = (str: string) => str.replace(' ', '').replace(' ', '').replace('-', '').replace('-', '');

  const getValue = () => unformat(inputEl.value);
  const setValue = (v: string) => { inputEl.value = format(v); };

  const formatCurrentValue = () => setValue(getValue());

  if (error) {
    const hasError = noRepeatMutatable(mapMutatable(error, (message) => message !== undefined));
    useMutatable(element, hasError, (isError) => { element.classList[isError ? 'add' : 'remove']('error'); });
    useMutatable(element, error, (errorMessage) => labelText.update(errorMessage === undefined ? label : errorMessage));
  }

  useMaybeMutatable(element, formats, formatCurrentValue);

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
