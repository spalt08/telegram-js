/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { withMountTrigger } from 'storybook/decorators';

import loginLayout from './login';

const stories = storiesOf('Login | Layout', module)
  .addDecorator(withMountTrigger);

stories.add('Common', () => loginLayout());
