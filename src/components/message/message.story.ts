/* eslint-disable max-len */
/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { withKnobs, text, boolean } from '@storybook/addon-knobs';
import { withMountTrigger, withChatLayout } from 'storybook/decorators';
import { Message, Peer, User, Chat } from 'mtproto-js';
import { messageCache, userCache, chatCache } from 'cache';
import { peerMessageToId } from 'helpers/api';

import commonMessage from 'mocks/messages/common.json';
import walter from 'mocks/users/walter.json';
import losPollos from 'mocks/chats/los_pollos.json';

import message from './message';


// Stories with media
require('./stories/audio.story');
require('./stories/photo.story');

// Stories with text
const stories = storiesOf('Messages | Regular', module)
  .addDecorator(withMountTrigger)
  .addDecorator(withChatLayout)
  .addDecorator(withKnobs);

stories.add('Single with User', () => {
  commonMessage.message = text('Message', 'You clearly don’t know who you’re talking to, so let me clue you in. I am not in danger, Skyler. I am the danger. A guy opens his door and gets shot, and you think that of me? No! I am the one who knocks!');
  commonMessage.out = boolean('Out', false);

  messageCache.put(commonMessage as Message);
  userCache.put(walter as User);

  return message(peerMessageToId(commonMessage.to_id as Peer, commonMessage.id), commonMessage.to_id as Peer);
});

stories.add('Single at Chat', () => {
  const peer: Peer = { _: 'peerChat', chat_id: losPollos.id };
  const chatMsgFromCommon = { ...commonMessage } as Message.message;

  chatMsgFromCommon.message = text('Message', 'You clearly don’t know who you’re talking to, so let me clue you in. I am not in danger, Skyler. I am the danger. A guy opens his door and gets shot, and you think that of me? No! I am the one who knocks!');
  chatMsgFromCommon.out = boolean('Out', false);
  chatMsgFromCommon.to_id = peer as any;

  messageCache.put(chatMsgFromCommon);
  userCache.put(walter as User);
  chatCache.put(losPollos as Chat);

  return message(peerMessageToId(peer, chatMsgFromCommon.id), peer);
});
