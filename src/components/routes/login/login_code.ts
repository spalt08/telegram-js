import { BehaviorSubject } from 'rxjs';
import { div, form, h1, p, text } from 'core/html';
import { button, MonkeyState, textInput, monkey } from 'components/ui';
import { listen } from 'core/dom';
import { MaybeObservable } from 'core/types';
import './login.scss';

interface Props {
  phone: MaybeObservable<string>;
}

/**
 * Layout for entering SMS code for sign in
 */
export default function loginCode({ phone }: Props) {
  const codeFieldError = new BehaviorSubject<undefined | string>(undefined);
  const monkeyState = new BehaviorSubject<MonkeyState>('idle');

  const element = (
    form`.login__form`(
      monkey({
        state: monkeyState,
        className: 'login__monkey',
      }),
      h1`.login__title`(text(phone)), // todo: Make it formatted
      p`.login__description`(text('We have sent you an SMS with the code')),
      div`.login__inputs`(
        textInput({
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
        }),
        button({ label: 'Next' }),
      ),
    )
  );

  listen(element, 'submit', (event: Event) => {
    event.preventDefault();
    codeFieldError.next('Invalid code');
  });

  return element;
}
