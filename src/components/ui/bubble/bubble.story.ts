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
  const messageControl = bubble(out, div(text('Line 1')), div(text('Line 2')), div(text('Line 3')));
  const isFirst = boolean('First', false);
  const isLast = boolean('Last', false);
  getInterface(messageControl).updateBorders(isFirst, isLast);
  return messageControl;
});

stories.add('Image Full', () => {
  const out = boolean('Out', false);
  const messageControl = bubble(out, img({ class: 'raw', src: 'https://picsum.photos/200/300' }));
  const isFirst = boolean('First', false);
  const isLast = boolean('Last', false);
  getInterface(messageControl).updateBorders(isFirst, isLast);
  return messageControl;
});

stories.add('Image Top', () => {
  const out = boolean('Out', false);
  const messageControl = bubble(out, img({ class: 'raw', src: 'https://picsum.photos/200/100' }), div(text('Description')));
  const isFirst = boolean('First', false);
  const isLast = boolean('Last', false);
  getInterface(messageControl).updateBorders(isFirst, isLast);
  return messageControl;
});

stories.add('Image Bottom', () => {
  const out = boolean('Out', false);
  const messageControl = bubble(out, true, div(text('Description')), img({ class: 'raw', src: 'https://picsum.photos/200/100' }));
  const isFirst = boolean('First', false);
  const isLast = boolean('Last', false);
  getInterface(messageControl).updateBorders(isFirst, isLast);
  return messageControl;
});
