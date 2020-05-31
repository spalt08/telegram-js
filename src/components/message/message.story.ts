/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { withKnobs, text, boolean } from '@storybook/addon-knobs';
import { withMountTrigger, withChatLayout } from 'storybook/decorators';
import { messageCache, userCache } from 'cache';
import { peerMessageToId } from 'helpers/api';
import { users } from 'mocks/user';
import { MessageRegular } from 'mocks/storybook';
import message from './message';


// Stories with media
require('./stories/photo.story');
require('./stories/poll.story');

// Stories with text
const stories = storiesOf('Layout | Message', module)
  .addDecorator(withMountTrigger)
  .addDecorator(withChatLayout)
  .addDecorator(withKnobs);

stories.add('Regular', () => {
  MessageRegular.message = text('Message', MessageRegular.message);
  MessageRegular.out = boolean('Out', false);

  messageCache.put(MessageRegular);
  userCache.put(users[1]);

  return message(peerMessageToId(MessageRegular.to_id, MessageRegular.id), MessageRegular.to_id);
});
