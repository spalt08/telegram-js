// @flow

import { div, form, img, h1, p } from 'core/html';
import { TextInput } from 'components/ui';
import logo from './logo.svg';
import './login.scss';

export default (
  div`.login`(
    form`.login__form`(
      img`.login__logo`({ src: logo }),
      h1`.login__title`('Sign in to Telegram'),
      p`.login__description`('Please confirm your country and enter your phone number.'),
      div`.login__inputs`(
        TextInput({ placeholder: 'Country' }),
        TextInput({ placeholder: 'Phone Number' }),
      ),
    ),
  )
);
