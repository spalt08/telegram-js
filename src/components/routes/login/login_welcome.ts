import { BehaviorSubject } from 'rxjs';
import { pluck } from 'rxjs/operators';
import { div, form, img, h1, p, text, label } from 'core/html';
import { blurAll, listen } from 'core/dom';
import { phoneInput, selectAutoComplete, button, checkbox } from 'components/ui';
import countries, { Country } from 'const/country';
import { getInterface } from 'core/hooks';
import logo from './logo.svg';
import './login.scss';

const countryOptionRenderer = ({ phone, label: countryLabel, emoji }: Country) => (
  div`.logincountry`(
    div`.logincountry__flag`(text(emoji)),
    div`.logincountry__label`(text(countryLabel)),
    div`.logincountry__phone`(text(phone)),
  )
);

interface Props {
  onSubmit(phone: string, remember: boolean): void;
}

/**
 * Welcome form layout with phone number input to sign in / sign up
 */
export default function loginWelcome({ onSubmit }: Props) {
  const country = new BehaviorSubject<Country>({
    code: '',
    emoji: '',
    label: '',
    phone: '',
  });
  const phoneFieldError = new BehaviorSubject<undefined | string>(undefined);
  const phoneField = phoneInput({
    label: 'Phone Number',
    name: 'phone',
    prefix: country.pipe(pluck('phone')),
    formats: country.pipe(pluck('phoneFormats')),
    error: phoneFieldError,
    onChange() {
      if (phoneFieldError.value !== undefined) {
        phoneFieldError.next(undefined);
      }
    },
  });
  const countryField = selectAutoComplete<Country>({
    label: 'Country',
    selected: 0,
    options: countries,
    optionRenderer: countryOptionRenderer,
    optionLabeler: (data) => data.label,
    onChange(data) {
      country.next(data);
      getInterface(phoneField).focus();
    },
  });
  const rememberField = checkbox({
    checked: true,
  });

  const element = (
    form`.login__form`(
      img`.login__logo`({ src: logo }),
      h1`.login__title`(text('Sign in to Telegram')),
      p`.login__description`(text('Please confirm your country and enter your phone number.')),
      div`.login__inputs`(
        countryField,
        phoneField,
        label`.login__checkmark`(
          rememberField,
          text('Keep me signed in'),
        ),
        button({ label: 'Next' }),
      ),
    )
  );

  listen(element, 'submit', (event: Event) => {
    event.preventDefault();
    blurAll(element);
    phoneFieldError.next('Invalid phone');
    onSubmit(
      getInterface(countryField).getValue().phone + getInterface(phoneField).getValue(),
      getInterface(rememberField).getChecked(),
    );
  });

  return element;
}
