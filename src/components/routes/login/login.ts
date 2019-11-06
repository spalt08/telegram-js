import { div, form, img, h1, p } from 'core/html';
import { Mutatable } from 'core/mutation';
import { phoneInput, selectAutoComplete, button } from 'components/ui';
import countries from 'const/country';
import logo from './logo.svg';
import './login.scss';

const countryRenderer = ({ phone, label, emoji }) => (
  div`.logincountry`(
    div`.logincountry__flag`(emoji),
    div`.logincountry__label`(label),
    div`.logincountry__phone`(phone),
  )
);

export default function login() {
  const country = new Mutatable<Object>({});

  let phoneInputRef;

  const handleSubmit = (event) => {
    event.preventDefault();
    phoneInputRef.blur();
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
            optionLabeler: (data) => data.label,
            onChange: (c) => {
              country.update(c);
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
      ),
    )
  );
}
