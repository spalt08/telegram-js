import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { div, form, h1, p, text } from 'core/html';
import { button, textInput } from 'components/ui';
import { blurAll, listen } from 'core/dom';
import { getInterface } from 'core/hooks';
import { formatWithCountry } from 'helpers/phone';
import { auth } from 'services';
import * as icons from 'components/icons';
import '../login.scss';

interface Props {
  onFocus(val: string): void,
  onBlur(val: string): void,
  onChange(val: string): void,
}

/**
 * Layout for entering SMS code for sign in
 */
export default function codeBasic({ onFocus, onBlur, onChange }: Props) {
  const isProcessing = new BehaviorSubject<boolean>(false);
  const err = auth.errCode;

  const inputCode = textInput({
    label: 'Code',
    error: err,
    disabled: isProcessing,
    onChange(val: string) {
      if (err.value !== undefined) err.next(undefined);
      onChange(val);
    },
    onFocus,
    onBlur,
  });

  let codeMsg = 'We have sent you an SMS with the code.';
  if (auth.codeType === 'auth.sentCodeTypeApp') codeMsg = 'We have sent you a message with the code at the telegram app.';
  if (auth.codeType === 'auth.sentCodeTypeCall') {
    codeMsg = 'You will receive an automatic call with a synthesized voice which tell you a verification code.';
  }

  const element = (
    form`.login__subform`(
      h1`.login__title`(
        text(formatWithCountry(auth.phoneCountry.value, auth.phoneNumber.value)),
        icons.edit({ class: 'login__title_icon', onClick: () => auth.state.next('unauthorized') }),
      ),
      p`.login__description`(text(codeMsg)),
      div`.login__inputs`(
        inputCode,
        button({
          label: isProcessing.pipe(map((prcs: boolean) => (prcs ? 'Please wait...' : 'Next'))),
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
