import { div, input, text } from 'core/html';
import { listen } from 'core/dom';
import { MaybeMutatable, Mutatable } from 'core/mutation';
import './phone_input.scss';

type Props = {
  onChange?: (value: string) => any;
  prefix?: MaybeMutatable<string>,
  formats?: MaybeMutatable<Array<string | number>>,
  label?: string,
  name?: string,
  ref?: (ref: HTMLInputElement) => any,
};

export default function phoneInput({ label = '', prefix = '', formats = [], onChange, ref, name }: Props) {
  let value = '';

  const inputEl = input({ type: 'text', name, autocomplete: 'off' });
  const element = div`.phoneinput`(
    div`.phoneinput__container`(
      div`.phoneinput__prefix`(text(prefix)),
      inputEl,
      div`.phoneinput__label`(text(label)),
    ),
  );

  const format = (str: string): string => {
    if (!str) return '';
    if (!formats) return str;

    let formated = '';
    let maxLength = 0;
    const formatsVal = formats instanceof Mutatable ? formats.value : formats;

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

  // To Do: fix replacement
  const unformat = (str: string) => str.replace(' ', '').replace(' ', '').replace('-', '').replace('-', '');

  listen(inputEl, 'focus', () => { element.className = 'phoneinput focused'; });
  listen(inputEl, 'blur', () => { element.className = 'phoneinput'; });
  listen(inputEl, 'input', (event: InputEvent) => {
    value = unformat(event.target instanceof HTMLInputElement ? event.target.value : '');
    inputEl.value = format(value);
    if (onChange) onChange(value);
  });

  if (ref) ref(inputEl);

  return element;
}
