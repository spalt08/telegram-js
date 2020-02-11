import { MaybeObservable } from 'core/types';
import { div, input } from 'core/html';
import { listen, mount, unmount } from 'core/dom';
import * as icons from 'components/icons';
import { useInterface, useMaybeObservable } from 'core/hooks';
import './search_input.scss';

export interface Props {
  placeholder?: MaybeObservable<string>;
  className?: string;
  isLoading?: MaybeObservable<boolean>;
  onChange?(value: string): void;
  onFocus?(value: string): void;
  onBlur?(value: string): void;
}

function makeHandleAction(callback: (value: string) => void) {
  return function handleAction(event: Event) {
    callback((event.target as HTMLInputElement).value);
  };
}

export default function searchInput({ placeholder, className = '', isLoading, onChange, onFocus, onBlur }: Props = {}) {
  const inputEl = input({
    type: 'search',
    placeholder,
  });
  let loadingEl: Element | undefined;
  const element = div`.searchInput ${className}`(
    inputEl,
    div`.searchInput__activeBG`(),
    icons.search({ className: 'searchInput__icon' }),
  );

  if (onChange) {
    listen(inputEl, 'input', makeHandleAction(onChange));
  }
  if (onFocus) {
    listen(inputEl, 'focus', makeHandleAction(onFocus));
  }
  if (onBlur) {
    listen(inputEl, 'blur', makeHandleAction(onBlur));
  }

  useMaybeObservable(element, isLoading, (isLoadingNow) => {
    if (isLoadingNow && !loadingEl) {
      loadingEl = icons.materialSpinner({ className: 'searchInput__loading' });
      element.classList.add('-loading');
      mount(element, loadingEl);
    }

    if (!isLoadingNow && loadingEl) {
      element.classList.remove('-loading');
      unmount(loadingEl);
      loadingEl = undefined;
    }
  });

  return useInterface(element, {
    focus() {
      inputEl.focus();
    },
  });
}
