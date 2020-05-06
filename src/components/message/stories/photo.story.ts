/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { withKnobs, boolean, text } from '@storybook/addon-knobs';
import { withMountTrigger, withChatLayout } from 'storybook/decorators';
import { messageCache, userCache } from 'cache';
import { peerMessageToId } from 'helpers/api';
import { MessageRegular } from 'mocks/storybook';
import { users } from 'mocks/user';
import message from '../message';

const stories = storiesOf('Layout | Message', module)
  .addDecorator(withMountTrigger)
  .addDecorator(withChatLayout)
  .addDecorator(withKnobs);

stories.add('Photo', () => {
  MessageRegular.message = text('Message', MessageRegular.message);
  MessageRegular.out = boolean('Out', false);

  messageCache.put(MessageRegular);
  userCache.put(users[1]);

  return message(peerMessageToId(MessageRegular.to_id, MessageRegular.id), MessageRegular.to_id);
});
