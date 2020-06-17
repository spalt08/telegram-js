/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { withKnobs, button as buttonKnob } from '@storybook/addon-knobs';
import { withMountTrigger } from 'storybook/decorators';
import { Document, DocumentAttribute } from 'mtproto-js';
import { getInterface } from 'core/hooks';

import playButton from './play_button';

const stories = storiesOf('Layout | UI Elements / Audio', module)
  .addDecorator(withKnobs)
  .addDecorator(withMountTrigger)
  .addDecorator(centered);

const doc: Document.document = {
  _: 'document',
  id: '1',
  access_hash: '1',
  file_reference: new Uint8Array(1),
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

stories.add('Play Button', () => {
  const button = playButton(doc);
  return button;
});
