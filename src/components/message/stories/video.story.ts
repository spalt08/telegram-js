/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { withKnobs, boolean, text } from '@storybook/addon-knobs';
import { withMountTrigger, withChatLayout } from 'storybook/decorators';
import { Message, Peer } from 'client/schema';
import { messageCache } from 'cache';
import { peerMessageToId } from 'helpers/api';

import videoMessage from 'mocks/messages/with_video.json';

import message from '../message';

const stories = storiesOf('Messages | With Video', module)
  .addDecorator(withMountTrigger)
  .addDecorator(withChatLayout)
  .addDecorator(withKnobs);

stories.add('Only video', () => {
  videoMessage.message = '';
  videoMessage.reply_to_msg_id = 0;
  videoMessage.out = boolean('Out', false);

  messageCache.put(videoMessage as Message);

  const messageControl = message(peerMessageToId(videoMessage.to_id as Peer, videoMessage.id), videoMessage.to_id as Peer);
  return messageControl;
});

stories.add('With Text', () => {
  videoMessage.message = 'Kitties';
  videoMessage.reply_to_msg_id = 0;
  videoMessage.out = boolean('Out', false);

  messageCache.put(videoMessage as Message);

  const messageControl = message(peerMessageToId(videoMessage.to_id as Peer, videoMessage.id), videoMessage.to_id as Peer);
  return messageControl;
});

stories.add('With Reply', () => {
  videoMessage.reply_to_msg_id = videoMessage.id;
  videoMessage.message = text('Message', 'Type any message');
  videoMessage.out = boolean('Out', false);

  messageCache.put(videoMessage as Message);

  const messageControl = message(peerMessageToId(videoMessage.to_id as Peer, videoMessage.id), videoMessage.to_id as Peer);
  return messageControl;
});
