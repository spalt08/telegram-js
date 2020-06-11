/* eslint-disable import/no-extraneous-dependencies,no-console */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { withKnobs, boolean } from '@storybook/addon-knobs';
import { withMountTrigger, withChatLayout } from 'storybook/decorators';
import { div, text } from 'core/html';
import bubble from './bubble';

const stories = storiesOf('Layout | UI Elements / Bubble 2', module)
  .addDecorator(centered)
  .addDecorator(withMountTrigger)
  .addDecorator(withChatLayout)
  .addDecorator(withKnobs);

stories.add('Common', () => {
  const out = boolean('Out', false);
  const isFirst = boolean('First', true);
  const isLast = boolean('Last', true);

  return bubble({ out, isFirst, isLast }, div(text('Line 1')), div(text('Line 2')), div(text('Line 3')));
});
