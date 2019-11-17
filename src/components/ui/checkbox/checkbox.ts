import { div, input, label, span } from 'core/html';
import { useInterface } from 'core/hooks';
import { svgCodeToComponent } from 'core/factory';
import { listen, mount, unmount } from 'core/dom';
import { MaybeObservable } from 'core/types';
import checkmarkCode from './checkmark.svg?raw';
import './checkbox.scss';

interface Props {
  checked?: boolean;
  disabled?: MaybeObservable<boolean>;
  className?: string;
  onChange?(checked: boolean): void;
}

const checkmarkSvg = svgCodeToComponent(checkmarkCode);

/**
 * A single styled checkbox
 */
export default function checkbox({ checked, disabled, className = '', onChange }: Props = {}) {
  const inputEl = input`.checkbox__input`({ type: 'checkbox', checked, disabled });
  const box = span`.checkbox__box`(
    span`.checkbox__checkmark`(
      checkmarkSvg({ class: 'checkbox__checkmark_image' }),
    ),
  );
  const element = label`.checkbox ${className}`(
    inputEl,
    box,
  );

  listen(inputEl, 'change', () => {
    const effect = div`.checkbox__ripple ${inputEl.checked ? '-on' : '-off'}`({
      onAnimationEnd: () => unmount(effect),
    });
    mount(box, effect);

    if (onChange) {
      onChange(inputEl.checked);
    }
  });

  return useInterface(element, {
    getChecked() {
      return inputEl.checked;
    },
    setChecked(newChecked: boolean) {
      inputEl.checked = newChecked;
    },
  });
}
