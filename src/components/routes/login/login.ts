import { div, form, img, h1, p } from 'core/html';
import { Mutatable } from 'core/mutation';
import { phoneInput, selectAutoComplete, button } from 'components/ui';
import countries, { Country } from 'const/country';
import logo from './logo.svg';
import './login.scss';

const countryRenderer = ({ phone, label, emoji }: Country) => (
  div`.logincountry`(
    div`.logincountry__flag`(emoji),
    div`.logincountry__label`(label),
    div`.logincountry__phone`(phone),
  )
);

export default function login() {
  const country = new Mutatable<Object>({});

  let phoneInputRef: HTMLElement;

  const handleSubmit = (event: Event) => {
    event.preventDefault();
    if (phoneInputRef) phoneInputRef.blur();
  };

  return (
    div`.login`(
      form`.login__form`({ onSubmit: handleSubmit })(
        img`.login__logo`({ src: logo }),
        h1`.login__title`('Sign in to Telegram'),
        p`.login__description`('Please confirm your country and enter your phone number.'),
        div`.login__inputs`(
          selectAutoComplete({
            label: 'Country',
            selected: 0,
            options: countries,
            optionRenderer: countryRenderer,
            optionLabeler: (data: Country) => data.label,
            onChange: (data: Country) => {
              country.update(data);
              if (phoneInputRef) phoneInputRef.focus();
            },
          }),
          phoneInput({
            label: 'Phone Number',
            name: 'phone',
            prefix: country.use('phone'),
            formats: country.use('phoneFormats'),
            ref: (r: HTMLInputElement) => { phoneInputRef = r; },
          }),
          button({ label: 'Next' }),
        ),
      ),
    )
  );
}
