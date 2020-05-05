/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { number, select, withKnobs } from '@storybook/addon-knobs';
import { withMountTrigger, withEmptyFileCache, centered } from 'storybook/decorators';
import videoStreaming from 'mocks/documents/video_streaming.json';
import { Document } from 'mtproto-js';
import videoPreview from './preview';

const stories = storiesOf('Media | Video', module)
  .addDecorator(withMountTrigger)
  .addDecorator(withEmptyFileCache)
  .addDecorator(centered)
  .addDecorator(withKnobs);

stories.add('Preview', () => (
  videoPreview(videoStreaming as Document.document, {
    fit: select('Fit Mode', ['cover', 'contain'], 'contain'),
    width: number('Width', 520),
    minHeight: number('Min Height', 320),
  })
));
