import { BehaviorSubject, Observable } from 'rxjs';
import { div, form, h1, p, text } from 'core/html';
import { button, textInput, monkey } from 'components/ui';
import { State as MonkeyState } from 'components/ui/monkey/monkey';
import { blurAll, listen } from 'core/dom';
import { getInterface, useObservable } from 'core/hooks';
import './login.scss';

interface Props {
  isSubmitting?: Observable<boolean>;
  passwordError?: Observable<string>;
  onSubmit(code: string): void;
}

/**
 * Layout for entering SMS code for sign in
 */
export default function loginCode({ isSubmitting, passwordError, onSubmit }: Props) {
  const passwordFieldError = new BehaviorSubject<undefined | string>(undefined);
  const monkeyState = new BehaviorSubject<MonkeyState>('close');

  const passwordField = textInput({
    label: 'Password',
    type: 'password',
    error: passwordFieldError,
    onChange() {
      if (passwordFieldError.value !== undefined) {
        passwordFieldError.next(undefined);
      }
    },
  });

  const element = (
    form`.login__form`(
      monkey({
        state: monkeyState,
        className: 'login__monkey',
      }),
      h1`.login__title`(text('Enter a Password')),
      p`.login__description`(text('Your account is protected with an additional password')),
      div`.login__inputs`(
        passwordField,
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
      onSubmit(getInterface(passwordField).getValue());
    }
  });

  if (passwordError) {
    useObservable(element, passwordError, (errorMessage) => passwordFieldError.next(errorMessage));
  }

  return element;
}
