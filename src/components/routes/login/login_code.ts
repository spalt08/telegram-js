import { div, form, h1, p, text } from 'core/html';
import { button, textInput } from 'components/ui';
import './login.scss';

export default function loginCode() {
  return (
    form`.login__form`(
      h1`.login__title`(text('Enter Code')),
      p`.login__description`(text('We have sent you an SMS with the code')),
      div`.login__inputs`(
        textInput({
          label: 'Code',
        }),
        button({ label: 'Next' }),
      ),
    )
  );
}
