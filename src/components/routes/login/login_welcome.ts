import { div, form, img, h1, p, text } from 'core/html';
import { Mutatable } from 'core/mutation';
import { phoneInput, selectAutoComplete, button } from 'components/ui';
import countries, { Country } from 'const/country';
import logo from './logo.svg';
import './login.scss';

const countryRenderer = ({ phone, label, emoji }: Country) => (
  div`.logincountry`(
    div`.logincountry__flag`(text(emoji)),
    div`.logincountry__label`(text(label)),
    div`.logincountry__phone`(text(phone)),
  )
);

export default function loginWelcome() {
  const country = new Mutatable<Object>({});

  let phoneInputRef: HTMLElement;

  const handleSubmit = (event: Event) => {
    event.preventDefault();
    if (phoneInputRef) phoneInputRef.blur();
  };

  return (
    form`.login__form`({ onSubmit: handleSubmit },
      img`.login__logo`({ src: logo }),
      h1`.login__title`(text('Sign in to Telegram')),
      p`.login__description`(text('Please confirm your country and enter your phone number.')),
      div`.login__inputs`(
        selectAutoComplete<Country>({
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
          ref: (r) => { phoneInputRef = r; },
        }),
        button({ label: 'Next' }),
      ),
    )
  );
}
