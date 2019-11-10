import { BehaviorSubject } from 'rxjs';
import { div, form, h1, p, text } from 'core/html';
import { button, textInput } from 'components/ui';
import { listen } from 'core/dom';
import './login.scss';

/**
 * Layout for entering SMS code for sign in
 */
export default function loginCode() {
  const codeFieldError = new BehaviorSubject<undefined | string>(undefined);

  const element = (
    form`.login__form`(
      h1`.login__title`(text('Enter Code')),
      p`.login__description`(text('We have sent you an SMS with the code')),
      div`.login__inputs`(
        textInput({
          label: 'Code',
          error: codeFieldError,
          onChange() {
            if (codeFieldError.value !== undefined) {
              codeFieldError.next(undefined);
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
