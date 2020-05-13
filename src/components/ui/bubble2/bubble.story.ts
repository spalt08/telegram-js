/* eslint-disable import/no-extraneous-dependencies,no-console */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { withKnobs, boolean } from '@storybook/addon-knobs';
import { withMountTrigger, withChatLayout } from 'storybook/decorators';
import { div, text } from 'core/html';
import { getInterface } from 'core/hooks';
import bubble from './bubble';

const stories = storiesOf('Layout | UI Elements / Bubble 2', module)
  .addDecorator(centered)
  .addDecorator(withMountTrigger)
  .addDecorator(withChatLayout)
  .addDecorator(withKnobs);

stories.add('Common', () => {
  const out = boolean('Out', false);
  const bubbleControl = bubble({ out }, div(text('Line 1')), div(text('Line 2')), div(text('Line 3')));
  const isFirst = boolean('First', true);
  const isLast = boolean('Last', true);
  getInterface(bubbleControl).updateBorders(isFirst, isLast);
  return bubbleControl;
});
