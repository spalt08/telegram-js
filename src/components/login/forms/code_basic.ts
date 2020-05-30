import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { div, form, h1, p, text } from 'core/html';
import { button, textInput } from 'components/ui';
import { blurAll, listen } from 'core/dom';
import { getInterface } from 'core/hooks';
import { formatWithCountry } from 'helpers/phone';
import { auth, AuthStage } from 'services';
import * as icons from 'components/icons';
import { humanizeErrorOperator } from 'helpers/humanizeError';
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

  async function checkCode(code: string) {
    if (!isProcessing.value) {
      try {
        isProcessing.next(true);
        await auth.checkCode(code);
      } finally {
        isProcessing.next(false);
      }
    }
  }

  const err = auth.errCode;
  let inputEl: HTMLInputElement;

  const inputCode = textInput({
    label: 'Code',
    error: err.pipe(humanizeErrorOperator()),
    disabled: isProcessing,
    maxLength: auth.codeLength !== -1 ? auth.codeLength : undefined,
    ref: (el: HTMLInputElement) => { inputEl = el; },
    onChange: async (val: string) => {
      if (err.value !== undefined) err.next(undefined);

      const value = val.trim();

      inputEl.value = value;

      onChange(value);

      if (auth.codeLength === value.length) {
        inputEl.blur();

        await checkCode(value);
      }
    },
    onFocus,
    onBlur,
  });

  let codeMsg = 'We have sent you an SMS with the code.';
  if (auth.codeType === 'auth.sentCodeTypeApp') codeMsg = 'We have sent you a message with the code at the Telegram app.';
  if (auth.codeType === 'auth.sentCodeTypeCall') {
    codeMsg = 'You will receive an automatic call with a synthesized voice which tell you a verification code.';
  }

  const element = (
    form`.login__subform`(
      h1`.login__title`(
        text(formatWithCountry(auth.phoneCountry.value, auth.phoneNumber.value)),
        icons.edit({ class: 'login__title_icon', onClick: () => auth.state.next(AuthStage.Unauthorized) }),
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

  listen(element, 'submit', async (event: Event) => {
    event.preventDefault();
    blurAll(element);

    await checkCode(getInterface(inputCode).getValue());
  });

  return element;
}
