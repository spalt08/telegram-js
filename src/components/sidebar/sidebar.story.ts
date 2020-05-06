/* eslint-disable import/no-extraneous-dependencies,no-console */
import { storiesOf } from '@storybook/html';
import { withMountTrigger, withChatLayout, centered } from 'storybook/decorators';
import sidebar from './sidebar';

const stories = storiesOf('Layout | Sidebar / Overall', module)
  .addDecorator(centered)
  .addDecorator(withMountTrigger)
  .addDecorator(withChatLayout);

stories.add('Left', () => sidebar({ kind: 'left', initial: 'dialogs', className: '-left' }));
