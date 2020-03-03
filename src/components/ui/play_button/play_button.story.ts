/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { withKnobs, optionsKnob } from '@storybook/addon-knobs';
import { Document, DocumentAttribute } from 'cache/types';
import { getInterface } from 'core/hooks';
import { MediaPlaybackStatus } from 'services/media';

import playButton from './play_button';

const stories = storiesOf('II. UI Elements | Play Button', module)
  .addDecorator(centered)
  .addDecorator(withKnobs);

const doc: Document.document = {
  _: 'document',
  id: '1',
  access_hash: '1',
  file_reference: '1',
  date: 0,
  mime_type: '?',
  size: 100,
  dc_id: 1,
  attributes: [
    {
      _: 'documentAttributeAudio',
      duration: 123,
    } as DocumentAttribute.documentAttributeAudio,
  ],
};

stories.add('Common Usage', () => {
  const button = playButton(doc);
  getInterface(button).setStatus(optionsKnob('State', {
    NotStarted: MediaPlaybackStatus.NotStarted,
    Playing: MediaPlaybackStatus.Playing,
    Stopped: MediaPlaybackStatus.Stopped,
  }, MediaPlaybackStatus.NotStarted, { display: 'select' }));
  button.style.setProperty('--accent-color', '#4fae4f');
  button.style.setProperty('--bubble-background', '#eeffde');
  return button;
});
