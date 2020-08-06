import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { div } from 'core/html';
import { getInterface, useInterface, useObservable } from 'core/hooks';
import * as icons from 'components/icons';
import { listen } from 'core/dom';
import textInput, { Props as TextInputProps } from '../text_input/text_input';
import './password_input.scss';

interface Props extends Omit<TextInputProps, 'type' | 'className' | 'inputClassName'> {
  label?: string;
  className?: string;
  inputClassName?: string;
  initiallyHidden?: boolean;
  onHideToggle?(isHidden: boolean): void;
}

export default function passwordInput({ className = '', inputClassName = '', initiallyHidden = true, onHideToggle, ...inputProps }: Props) {
  const isHidden = new BehaviorSubject(initiallyHidden);

  const inputEl = textInput({
    ...inputProps,
    type: isHidden.pipe(map((hidden) => (hidden ? 'password' : 'text'))),
    inputClassName: `passwordInput__input ${inputClassName}`,
  });
  const toggleIcons = [
    icons.eye1({ class: 'passwordInput__toggle_show' }),
    icons.eye2({ class: 'passwordInput__toggle_hide' }),
  ];
  const element = div`.passwordInput ${className}`(
    inputEl,
    ...toggleIcons,
  );

  toggleIcons.forEach((icon) => {
    listen(icon, 'click', (event) => {
      event.preventDefault();
      const newIsHidden = !isHidden.value;
      isHidden.next(newIsHidden);
      if (onHideToggle) onHideToggle(newIsHidden);
    });
  });

  useObservable(element, isHidden, true, (hidden) => {
    element.classList.toggle('-hidden', hidden);
  });

  return useInterface(element, {
    getValue() {
      return getInterface(inputEl).getValue();
    },
  });
}
