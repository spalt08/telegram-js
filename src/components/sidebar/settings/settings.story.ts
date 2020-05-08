/* eslint-disable import/no-extraneous-dependencies,no-console */
import { storiesOf } from '@storybook/html';
import { action } from '@storybook/addon-actions';
import { withMountTrigger, centered } from 'storybook/decorators';
import settings from './settings';

const stories = storiesOf('Layout | Sidebar', module)
  .addDecorator(centered)
  .addDecorator(withMountTrigger);

stories.add('Settings', () => settings({
  onBack: () => action('back'),
  onNavigate: () => action('navigate'),
}));
