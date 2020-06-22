/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { BehaviorSubject } from 'rxjs';
import { withKnobs, boolean } from '@storybook/addon-knobs';
import { withMountTrigger, withChatLayout } from 'storybook/decorators';
import { messageCache, userCache } from 'cache';
import { peerMessageToId } from 'helpers/api';
import { MessageRegular, MessageSticker } from 'mocks/storybook';
import { users } from 'mocks/user';
import message from '../message';

const stories = storiesOf('Layout | Message', module)
  .addDecorator(withMountTrigger)
  .addDecorator(withChatLayout)
  .addDecorator(withKnobs);

stories.add('Sticker', () => {
  MessageRegular.out = boolean('Out', false);

  messageCache.put(MessageSticker);
  userCache.put(users);

  return message(peerMessageToId(MessageRegular.to_id, MessageSticker.id), new BehaviorSubject([undefined, undefined]));
});
