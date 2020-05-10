/* eslint-disable import/no-extraneous-dependencies,no-console */
import { storiesOf } from '@storybook/html';
import { withMountTrigger, withChatLayout, centered, withKnobWidth, withKnobPeer } from 'storybook/decorators';
import { withKnobs } from '@storybook/addon-knobs';
import header from './header';

const stories = storiesOf('Layout | History', module)
  .addDecorator(withKnobs)
  .addDecorator(withKnobWidth)
  .addDecorator(withKnobPeer)
  .addDecorator(centered)
  .addDecorator(withMountTrigger)
  .addDecorator(withChatLayout);

stories.add('Header', () => header());
