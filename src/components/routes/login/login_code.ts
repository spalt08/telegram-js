import { BehaviorSubject, Observable } from 'rxjs';
import { div, form, h1, p, text } from 'core/html';
import { button, MonkeyState, textInput, monkey } from 'components/ui';
import { blurAll, listen } from 'core/dom';
import { MaybeObservable } from 'core/types';
import './login.scss';
import { getInterface, useObservable } from '../../../core/hooks';

interface Props {
  phone: MaybeObservable<string>;
  isSubmitting?: Observable<boolean>;
  codeError?: Observable<string>;
  onSubmit(code: string): void;
}

/**
 * Layout for entering SMS code for sign in
 */
export default function loginCode({ phone, isSubmitting, codeError, onSubmit }: Props) {
  const codeFieldError = new BehaviorSubject<undefined | string>(undefined);
  const monkeyState = new BehaviorSubject<MonkeyState>('idle');

  const codeField = textInput({
    label: 'Code',
    error: codeFieldError,
    onChange(value) {
      if (codeFieldError.value !== undefined) {
        codeFieldError.next(undefined);
      }

      const newMonkeyState = value ? 'tracking' : 'idle';
      if (monkeyState.value !== newMonkeyState) {
        monkeyState.next(newMonkeyState);
      }
    },
  });

  const element = (
    form`.login__form`(
      monkey({
        state: monkeyState,
        className: 'login__monkey',
      }),
      h1`.login__title`(text(phone)), // todo: Make it formatted
      p`.login__description`(text('We have sent you an SMS with the code')),
      div`.login__inputs`(
        codeField,
        button({
          label: 'Next',
          disabled: isSubmitting,
          loading: isSubmitting,
        }),
      ),
    )
  );

  let isCurrentlySubmitting = false;
  if (isSubmitting) {
    useObservable(element, isSubmitting, (s) => { isCurrentlySubmitting = s; });
  }

  listen(element, 'submit', (event: Event) => {
    event.preventDefault();
    blurAll(element);
    if (!isCurrentlySubmitting) {
      onSubmit(getInterface(codeField).getValue());
    }
  });

  if (codeError) {
    useObservable(element, codeError, (errorMessage) => codeFieldError.next(errorMessage));
  }

  return element;
}
