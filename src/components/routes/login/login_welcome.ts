import { div, form, img, h1, p, text } from 'core/html';
import { listen } from 'core/dom';
import { Mutatable, mutateProperty } from 'core/mutation';
import { phoneInput, selectAutoComplete, button } from 'components/ui';
import countries, { Country } from 'const/country';
import logo from './logo.svg';
import './login.scss';

const countryOptionRenderer = ({ phone, label, emoji }: Country) => (
  div`.logincountry`(
    div`.logincountry__flag`(text(emoji)),
    div`.logincountry__label`(text(label)),
    div`.logincountry__phone`(text(phone)),
  )
);

/**
 * Welcome form layout with phone number input to sign in / sign up
 */
export default function loginWelcome() {
  const country = new Mutatable<Record<string, any>>({});
  let phoneInputRef: HTMLElement;

  const element = (
    form`.login__form`(
      img`.login__logo`({ src: logo }),
      h1`.login__title`(text('Sign in to Telegram')),
      p`.login__description`(text('Please confirm your country and enter your phone number.')),
      div`.login__inputs`(
        selectAutoComplete<Country>({
          label: 'Country',
          selected: 0,
          options: countries,
          optionRenderer: countryOptionRenderer,
          optionLabeler: (data: Country) => data.label,
          onChange: (data: Country) => {
            country.update(data);
            if (phoneInputRef) phoneInputRef.focus();
          },
        }),
        phoneInput({
          label: 'Phone Number',
          name: 'phone',
          prefix: mutateProperty<string>(country, 'phone'),
          formats: mutateProperty<Array<string | number>>(country, 'phoneFormats'),
          ref: (r) => { phoneInputRef = r; },
        }),
        button({ label: 'Next' }),
      ),
    )
  );

  listen(element, 'submit', (event: Event) => {
    event.preventDefault();
    if (phoneInputRef) phoneInputRef.blur();
  });

  return element;
}
