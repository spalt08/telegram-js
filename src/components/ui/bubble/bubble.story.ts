/* eslint-disable import/no-extraneous-dependencies */
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
  const image = img({ class: 'raw', src: `https://picsum.photos/${imgSize}/${imgSize}` });
  const createBubble = (container: HTMLElement) => {
    const out = boolean('Out', false);
    const i = img({ class: 'raw', src: image.src });
    const bubbleControl = bubble({ out, masked: true, onlyMedia: true }, i);
    const isFirst = boolean('First', true);
    const isLast = boolean('Last', true);
    getInterface(bubbleControl).updateBorders(isFirst, isLast);
    bubbleControl.style.position = 'absolute';
    bubbleControl.style.top = `${Math.random() * (container.clientHeight - imgSize)}px`;
    bubbleControl.style.left = `${Math.random() * (container.clientWidth - imgSize)}px`;
    return bubbleControl;
  };
  const fillWithBubbles = (container: HTMLElement) => {
    const d = div({ style: { width: '100%', height: '100%' } });
    for (let i = 0; i < bubblesCount; i++) {
      d.append(createBubble(container));
    }
    container.append(d);
  };
  const container = div({ style: { position: 'relative', width: '100%', height: '100%' } });
  image.onload = () => {
    setTimeout(() => {
      console.time('bubble');
      fillWithBubbles(container);
      console.timeEnd('bubble');
    }, 0);
  }
  return container;
});
