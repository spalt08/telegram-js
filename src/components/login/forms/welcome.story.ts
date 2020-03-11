/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { withMountTrigger } from 'storybook/decorators';
import welcomeForm from './welcome';

const stories = storiesOf('Login | Forms', module)
  .addDecorator(withMountTrigger)
  .addDecorator(centered);

stories.add('Welcome', () => welcomeForm());
