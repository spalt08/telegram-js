import { MaybeObservable } from 'core/types';
import { div, input } from 'core/html';
import { listen } from 'core/dom';
import * as icons from 'components/icons';
import './search_input.scss';

export interface Props {
  placeholder?: MaybeObservable<string>;
  className?: string;
  onChange?(value: string): void;
  onFocus?(value: string): void;
  onBlur?(value: string): void;
}

function makeHandleAction(callback: (value: string) => void) {
  return function handleAction(event: Event) {
    callback((event.target as HTMLInputElement).value);
  };
}

export default function searchInput({ placeholder, className = '', onChange, onFocus, onBlur }: Props = {}) {
  const inputEl = input({
    type: 'search',
    placeholder,
  });
  const element = div`.searchInput ${className}`(
    inputEl,
    div`.searchInput__activeBG`(),
    icons.search({ className: 'searchInput__icon' }),
  );

  if (onChange) {
    listen(inputEl, 'change', makeHandleAction(onChange));
  }
  if (onFocus) {
    listen(inputEl, 'focus', makeHandleAction(onFocus));
  }
  if (onBlur) {
    listen(inputEl, 'blur', makeHandleAction(onBlur));
  }

  return element;
}
