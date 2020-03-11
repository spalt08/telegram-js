/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { withKnobs, button as buttonKnob } from '@storybook/addon-knobs';
import { withMountTrigger } from 'storybook/decorators';
import { Document, DocumentAttribute } from 'client/schema';
import { getInterface } from 'core/hooks';

import playButton from './play_button';

const stories = storiesOf('UI Elements | Play Audio Button', module)
  .addDecorator(withKnobs)
  .addDecorator(withMountTrigger)
  .addDecorator(centered);

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
  buttonKnob('Download', () => {
    setTimeout(() => getInterface(button).download());
  });
  button.style.setProperty('--accent-color', '#4fae4f');
  button.style.setProperty('--bubble-background', '#eeffde');
  return button;
});
