/* eslint-disable import/no-extraneous-dependencies,no-console */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { withKnobs, boolean, number } from '@storybook/addon-knobs';
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
  const bubbleControl = bubble({ out }, div(text('Line 1')), div(text('Line 2')), div(text('Line 3')));
  const isFirst = boolean('First', true);
  const isLast = boolean('Last', true);
  getInterface(bubbleControl).updateBorders(isFirst, isLast);
  return bubbleControl;
});

stories.add('Image Full', () => {
  const img500x300 = img({ class: 'raw', src: 'https://picsum.photos/500/300' });
  const out = boolean('Out', false);
  const bubbleControl = bubble({ out, masked: true, onlyMedia: true }, img500x300);
  const isFirst = boolean('First', true);
  const isLast = boolean('Last', true);
  getInterface(bubbleControl).updateBorders(isFirst, isLast);
  return bubbleControl;
});

stories.add('Image Top', () => {
  const img400x300 = img({ class: 'raw', src: 'https://picsum.photos/400/300' });
  const out = boolean('Out', false);
  const bubbleControl = bubble({ out }, img400x300, div(text('Some Text')));
  const isFirst = boolean('First', true);
  const isLast = boolean('Last', true);
  getInterface(bubbleControl).updateBorders(isFirst, isLast);
  return bubbleControl;
});

stories.add('Image Bottom', () => {
  const img400x300 = img({ class: 'raw', src: 'https://picsum.photos/400/300' });
  const out = boolean('Out', false);
  const bubbleControl = bubble({ out, masked: true }, div(text('Quoted Message')), img400x300);
  const isFirst = boolean('First', true);
  const isLast = boolean('Last', true);
  getInterface(bubbleControl).updateBorders(isFirst, isLast);
  return bubbleControl;
});

const storiesPerf = storiesOf('UI Elements | Bubble', module)
  .addDecorator(withMountTrigger)
  .addDecorator(withChatLayout)
  .addDecorator(withKnobs);

storiesPerf.add('Performance Test', () => {
  const bubblesCount = number('Bubbles count', 100, { range: true, min: 1, max: 10000 });
  const imgSize = number('Image size (px)', 100, { range: true, min: 40, max: 500 });
  const out = boolean('Out', false);
  const isFirst = boolean('First', true);
  const isLast = boolean('Last', true);
  const image = img({ class: 'raw', src: `https://picsum.photos/${imgSize}/${imgSize}` });
  const createBubble = (cWidth: number, cHeight: number) => {
    const i = img({ class: 'raw', src: image.src });
    const bubbleControl = bubble({ out, masked: true, onlyMedia: true }, i);
    getInterface(bubbleControl).updateBorders(isFirst, isLast);
    bubbleControl.style.position = 'absolute';
    bubbleControl.style.left = `${Math.random() * (cWidth - imgSize)}px`;
    bubbleControl.style.top = `${Math.random() * (cHeight - imgSize)}px`;
    return bubbleControl;
  };
  const fillWithBubbles = (container: HTMLElement) => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    for (let i = 0; i < bubblesCount; i++) {
      container.append(createBubble(width, height));
    }
  };
  const container = div({ style: { position: 'relative', width: '100%', height: '100%' } });
  image.onload = () => {
    console.time('bubble');
    fillWithBubbles(container);
    console.timeEnd('bubble');
  };
  return container;
});
