/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { withKnobs, boolean } from '@storybook/addon-knobs';
import { withMountTrigger, withChatLayout } from 'storybook/decorators';
import { div, text, img } from 'core/html';
import { getInterface } from 'core/hooks';
import bubble from './bubble';

const stories = storiesOf('UI Elements | Bubble', module)
  .addDecorator(centered)
  .addDecorator(withMountTrigger)
  .addDecorator(withChatLayout)
  .addDecorator(withKnobs);

stories.add('Common Usage', () => {
  const out = boolean('Out', false);
  const messageControl = bubble(out, false, false, div(text('Line 1')), div(text('Line 2')), div(text('Line 3')));
  const isFirst = boolean('First', true);
  const isLast = boolean('Last', true);
  getInterface(messageControl).updateBorders(isFirst, isLast);
  return messageControl;
});

stories.add('Image Full', () => {
  const img500x300 = img({ class: 'raw', src: 'https://picsum.photos/500/300' });
  const out = boolean('Out', false);
  const messageControl = bubble(out, true, true, img500x300);
  const isFirst = boolean('First', true);
  const isLast = boolean('Last', true);
  getInterface(messageControl).updateBorders(isFirst, isLast);
  return messageControl;
});

stories.add('Image Top', () => {
  const img400x300 = img({ class: 'raw', src: 'https://picsum.photos/400/300' });
  const out = boolean('Out', false);
  const messageControl = bubble(out, false, false, img400x300, div(text('Some Text')));
  const isFirst = boolean('First', true);
  const isLast = boolean('Last', true);
  getInterface(messageControl).updateBorders(isFirst, isLast);
  return messageControl;
});

stories.add('Image Bottom', () => {
  const img400x300 = img({ class: 'raw', src: 'https://picsum.photos/400/300' });
  const out = boolean('Out', false);
  const messageControl = bubble(out, true, false, div(text('Quoted Message')), img400x300);
  const isFirst = boolean('First', true);
  const isLast = boolean('Last', true);
  getInterface(messageControl).updateBorders(isFirst, isLast);
  return messageControl;
});
