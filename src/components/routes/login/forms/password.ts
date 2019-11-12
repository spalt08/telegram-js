import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { div, form, h1, p, text } from 'core/html';
import { button, tgs, passwordInput } from 'components/ui';
import { blurAll, listen } from 'core/dom';
import { getInterface } from 'core/hooks';
import { auth } from 'services';
import closePeek from 'assets/monkey_close.tgs';
import '../login.scss';

/**
 * Layout for 2FA password input
 */
export default function formPassword() {
  const isProcessing = new BehaviorSubject<boolean>(false);
  const err = auth.errPassword;

  const inputPassword = passwordInput({
    label: 'Password',
    name: 'password',
    initiallyHidden: true,
    error: err,
    onChange: () => err.value !== undefined && err.next(undefined),
    onHideToggle(isHidden: boolean) {
      console.log(isHidden);
    },
  });

  const element = (
    form`.login__form`(
      tgs({ className: 'login__monkey', src: closePeek, autoplay: true, loop: true }),
      h1`.login__title`(text('Enter a Password')),
      p`.login__description`(text('Your account is protected with an additional password')),
      div`.login__inputs`(
        inputPassword,
        button({
          label: isProcessing.pipe(map((prcs: boolean) => (prcs ? 'Please wait...' : 'Next'))),
          disabled: isProcessing,
          loading: isProcessing,
        }),
      ),
    )
  );

  listen(element, 'submit', (event: Event) => {
    blurAll(element);

    if (!isProcessing.value) {
      isProcessing.next(true);
      const password = getInterface(inputPassword).getValue();

      auth.checkPassword(password, () => isProcessing.next(false));
    }

    event.preventDefault();
  });

  return element;
}
