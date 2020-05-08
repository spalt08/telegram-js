/* eslint-disable import/no-extraneous-dependencies,no-console */
import { storiesOf } from '@storybook/html';
import { withMountTrigger, withChatLayout, centered } from 'storybook/decorators';
import home from './home';

const stories = storiesOf('Layout', module)
  .addDecorator(centered)
  .addDecorator(withMountTrigger)
  .addDecorator(withChatLayout);

stories.add('Main', () => home());
