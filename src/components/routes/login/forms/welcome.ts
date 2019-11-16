import { BehaviorSubject } from 'rxjs';
import { pluck, map } from 'rxjs/operators';
import { div, form, img, h1, p, text, label } from 'core/html';
import { blurAll, listen } from 'core/dom';
import { phoneInput, selectAutoComplete, button, checkbox } from 'components/ui';
import countries, { Country } from 'const/country';
import { getInterface } from 'core/hooks';
import { auth } from 'services';
import logo from 'assets/logo.svg';
import '../login.scss';

const countryOptionRenderer = ({ phone, label: countryLabel, emoji }: Country) => (
  div`.logincountry`(
    div`.logincountry__flag`(text(emoji)),
    div`.logincountry__label`(text(countryLabel)),
    div`.logincountry__phone`(text(phone)),
  )
);

/**
 * Welcome form layout with phone number input to sign in / sign up
 */
export default function formWelcome() {
  const isProcessing = new BehaviorSubject<boolean>(false);
  const phonePrefix = auth.phoneCountry.pipe(pluck('phone'));
  const phoneFormats = auth.phoneCountry.pipe(pluck('phoneFormats'));
  const err = auth.errPhone;

  const inputPhone = phoneInput({
    label: 'Phone Number',
    name: 'phone',
    prefix: phonePrefix,
    formats: phoneFormats,
    disabled: isProcessing,
    error: err,
    onChange: () => err.value !== undefined && err.next(undefined),
  });

  const inputCountry = selectAutoComplete<Country>({
    label: 'Country',
    selected: 0,
    options: countries,
    disabled: isProcessing,
    optionRenderer: countryOptionRenderer,
    optionLabeler: (data) => data.label,
    onChange(data) {
      auth.phoneCountry.next(data);
      getInterface(inputPhone).focus();
    },
  });

  // todo: Disable during login
  // todo: Make the storage consider this option
  const inputRemember = checkbox({ checked: true });

  const element = (
    form`.login__form`(
      img`.login__logo`({ src: logo }),
      h1`.login__title`(text('Sign in to Telegram')),
      p`.login__description`(text('Please confirm your country and enter your phone number.')),
      div`.login__inputs`(
        inputCountry,
        inputPhone,
        label`.login__checkmark`(
          inputRemember,
          text('Keep me signed in'),
        ),
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

    if (isProcessing.value === false) {
      isProcessing.next(true);
      const phoneNumber = getInterface(inputPhone).getValue();

      auth.sendCode(phoneNumber, () => isProcessing.next(false));
    }

    event.preventDefault();
  });

  return element;
}
