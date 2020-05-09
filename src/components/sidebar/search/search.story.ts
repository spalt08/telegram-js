/* eslint-disable import/no-extraneous-dependencies,no-console */
import { storiesOf } from '@storybook/html';
import { action } from '@storybook/addon-actions';
import { withKnobs } from '@storybook/addon-knobs';
import { withMountTrigger, centered, withKnobPeer, withKnobWidth } from 'storybook/decorators';
import search from './search';

const stories = storiesOf('Layout | Sidebar', module)
  .addDecorator(withMountTrigger)
  .addDecorator(withKnobs)
  .addDecorator(withKnobPeer)
  .addDecorator(withKnobWidth)
  .addDecorator(centered);

stories.add('Search', () => search({
  onBack: () => action('back'),
  onNavigate: () => action('navigate'),
}));
