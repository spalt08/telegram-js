/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { number, select, withKnobs } from '@storybook/addon-knobs';
import { withMountTrigger, withEmptyFileCache } from 'storybook/decorators';
import photoSquare from 'mocks/photos/photo_square';
import photoLandscape from 'mocks/photos/photo_landscape';
import photoRenderer from './photo';

const stories = storiesOf('Media | Photo', module)
  .addDecorator(withMountTrigger)
  .addDecorator(withEmptyFileCache)
  .addDecorator(centered)
  .addDecorator(withKnobs);

stories.add('Square', () => (
  photoRenderer(photoSquare, {
    fit: select('Fit Mode', ['cover', 'contain'], 'cover'),
    width: number('Width', 320),
    height: number('Height', 320),
  })
));

stories.add('Landscape', () => (
  photoRenderer(photoLandscape, {
    fit: select('Fit Mode', ['cover', 'contain'], 'contain'),
    width: number('Width', 320),
    minHeight: number('Min height', 320),
  })
));
