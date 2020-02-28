/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';

import welcomeForm from './welcome';

const stories = storiesOf('I. Login | Forms', module)
  .addDecorator(centered);

stories.add('Welcome', () => welcomeForm());
