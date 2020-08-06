/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { withMountTrigger, centered } from 'storybook/decorators';
import { auth, AuthStage } from 'services';
import codeForm from './code';

const stories = storiesOf('Login | Forms', module)
  .addDecorator(withMountTrigger)
  .addDecorator(centered);

stories.add('Code', () => {
  auth.state.next(AuthStage.Code);
  return codeForm();
});

stories.add('2FA', () => {
  auth.state.next(AuthStage.TwoFA);
  return codeForm();
});
