/* eslint-disable import/no-extraneous-dependencies,no-console */
import { storiesOf } from '@storybook/html';
import { withMountTrigger, withChatLayout, centered } from 'storybook/decorators';
import leftSidebar from './left';

const stories = storiesOf('Sidebars | Left', module)
  .addDecorator(centered)
  .addDecorator(withMountTrigger)
  .addDecorator(withChatLayout);

stories.add('Common', () => leftSidebar());
