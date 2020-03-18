/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { withKnobs, boolean, text } from '@storybook/addon-knobs';
import { withMountTrigger, withChatLayout } from 'storybook/decorators';
import { Message, Peer } from 'client/schema';
import { messageCache } from 'cache';
import { peerMessageToId } from 'helpers/api';

import photoMessage from 'mocks/messages/with_photo.json';
import photoLandscape from 'mocks/photos/photo_landscape.json';

import message from '../message';

const stories = storiesOf('Messages | With Photo', module)
  .addDecorator(withMountTrigger)
  .addDecorator(withChatLayout)
  .addDecorator(withKnobs);

stories.add('Only photo', () => {
  (photoMessage as any).media.photo = photoLandscape;
  photoMessage.message = '';
  photoMessage.reply_to_msg_id = 0;
  photoMessage.out = boolean('Out', false);

  messageCache.put(photoMessage as Message);

  const messageControl = message(peerMessageToId(photoMessage.to_id as Peer, photoMessage.id), photoMessage.to_id as Peer);
  return messageControl;
});

stories.add('With Text', () => {
  (photoMessage as any).media.photo = photoLandscape;
  photoMessage.message = 'Kitties';
  photoMessage.reply_to_msg_id = 0;
  photoMessage.out = boolean('Out', false);

  messageCache.put(photoMessage as Message);

  const messageControl = message(peerMessageToId(photoMessage.to_id as Peer, photoMessage.id), photoMessage.to_id as Peer);
  return messageControl;
});

stories.add('With Reply', () => {
  (photoMessage as any).media.photo = photoLandscape;
  photoMessage.reply_to_msg_id = photoMessage.id;
  photoMessage.message = text('Message', 'Type any message');
  photoMessage.out = boolean('Out', false);

  messageCache.put(photoMessage as Message);

  const messageControl = message(peerMessageToId(photoMessage.to_id as Peer, photoMessage.id), photoMessage.to_id as Peer);
  return messageControl;
});
