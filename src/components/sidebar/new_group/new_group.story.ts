/* eslint-disable import/no-extraneous-dependencies,no-console */
import { storiesOf } from '@storybook/html';
import { action } from '@storybook/addon-actions';
import { withMountTrigger, centered } from 'storybook/decorators';
import newGroup from './new_group';

const stories = storiesOf('Layout | Sidebar', module)
  .addDecorator(centered)
  .addDecorator(withMountTrigger);

stories.add('New Group', () => newGroup({
  onBack: () => action('back'),
  onNavigate: () => action('navigate'),
}));
