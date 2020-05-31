import { img } from 'core/html';
import { storiesOf } from '@storybook/html';
import stickerURL from './sticker.png';
import { decode } from './webp';


// Stories with text
const stories = storiesOf('Layout | Webp', module);

stories.add('Test', () => {
  const el = img();

  el.width = 512;
  el.height = 382;
  fetch(stickerURL)
    .then((r) => r.arrayBuffer())
    .then((ab) => {
      const src = decode(new Uint8Array(ab));
      el.src = src;
    });

  return el;
});
