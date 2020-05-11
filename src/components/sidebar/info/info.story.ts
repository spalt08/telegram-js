/* eslint-disable import/no-extraneous-dependencies,no-console */
import { storiesOf } from '@storybook/html';
import { action } from '@storybook/addon-actions';
import { withKnobs } from '@storybook/addon-knobs';
import { withMountTrigger, centered, withKnobPeer, withKnobWidth } from 'storybook/decorators';
import info from './info';

const stories = storiesOf('Layout | Sidebar', module)
  .addDecorator(withMountTrigger)
  .addDecorator(withKnobs)
  .addDecorator(withKnobPeer)
  .addDecorator(withKnobWidth)
  .addDecorator(centered);

stories.add('Info', () => info({
  onBack: () => action('back'),
  onNavigate: () => action('navigate'),
}));
