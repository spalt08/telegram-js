import { BehaviorSubject, Observable } from 'rxjs';
import { div, form, h1, p, text } from 'core/html';
import { button, textInput } from 'components/ui';
import { State as MonkeyState } from 'components/ui/monkey/monkey';
import { blurAll, listen } from 'core/dom';
import { MaybeObservable } from 'core/types';
import { getInterface, useObservable } from 'core/hooks';
import { formatWithCountry } from 'helpers/phone_number';
import * as icons from 'components/icons';
import monkey from '../monkey/monkey';
import '../login.scss';

interface Props {
  phone: MaybeObservable<string>; // Formatted, please
  isSubmitting?: Observable<boolean>;
  codeError?: Observable<string>;
  onSubmit(code: string): void;
  onReturnToPhone(): void;
}

/**
 * Layout for entering SMS code for sign in
 */
export default function codeForm({ phone, isSubmitting, codeError, onSubmit, onReturnToPhone }: Props) {
  const codeFieldError = new BehaviorSubject<undefined | string>(undefined);
  const monkeyState = new BehaviorSubject<MonkeyState>('idle');

  const codeField = textInput({
    label: 'Code',
    error: codeFieldError,
    onChange(value) {
      if (codeFieldError.value !== undefined) {
        codeFieldError.next(undefined);
      }

      monkeyState.next(value ? 'tracking' : 'idle');
    },
  });

  const element = (
    form`.login__form`(
      monkey(),
      h1`.login__title`(
        text(formatWithCountry(phone)),
        icons.edit({ class: 'login__title_icon', onClick: onReturnToPhone }),
      ),
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
