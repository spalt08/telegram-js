import { BehaviorSubject } from 'rxjs';
import { div, form, h1, p, text } from 'core/html';
import { button, textInput, tgs } from 'components/ui';
import { blurAll, listen } from 'core/dom';
import { getInterface } from 'core/hooks';
import { formatWithCountry } from 'helpers/phone';
import { auth } from 'services';
import tracking from 'assets/monkey_tracking.tgs';
import * as icons from 'components/icons';
import '../login.scss';

/**
 * Layout for entering SMS code for sign in
 */
export default function formCode() {
  const isProcessing = new BehaviorSubject<boolean>(false);
  const err = auth.errCode;

  const monkey = tgs({ className: 'login__monkey', src: tracking });

  const inputCode = textInput({
    label: 'Code',
    error: err,
    disabled: isProcessing,
    onChange(val: string) {
      if (err.value !== undefined) err.next(undefined);
      const frame = 20 + Math.floor((val.length / 38) * 120);
      getInterface(monkey).goTo(frame);
    },
    onFocus() {
      getInterface(monkey).goTo(20);
    },
    onBlur() {
      getInterface(monkey).goTo(0);
    },
  });

  err.subscribe((val) => val && getInterface(monkey).goTo(20));

  let codeMsg = 'We have sent you an SMS with the code.';
  if (auth.codeType === 'auth.sentCodeTypeApp') codeMsg = 'We have sent you a message with the code at the telegram app.';
  if (auth.codeType === 'auth.sentCodeTypeCall') {
    codeMsg = 'You will receive an automatic call with a synthesized voice which tell you a verification code.';
  }

  const element = (
    form`.login__form`(
      monkey,
      h1`.login__title`(
        text(formatWithCountry(auth.phoneCountry.value, auth.phoneNumber.value)),
        icons.edit({ class: 'login__title_icon', onClick: () => auth.state.next('unathorized') }),
      ),
      p`.login__description`(text(codeMsg)),
      div`.login__inputs`(
        inputCode,
        button({
          label: 'Next',
          disabled: isProcessing,
          loading: isProcessing,
        }),
      ),
    )
  );

  listen(element, 'submit', (event: Event) => {
    event.preventDefault();

    blurAll(element);

    if (!isProcessing.value) {
      isProcessing.next(true);

      const code = getInterface(inputCode).getValue();

      auth.checkCode(code, () => isProcessing.next(false));
    }
  });

  return element;
}
