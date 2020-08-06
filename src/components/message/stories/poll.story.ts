/* eslint-disable import/no-extraneous-dependencies */
import { BehaviorSubject } from 'rxjs';
import { MessageMedia } from 'mtproto-js';
import { storiesOf } from '@storybook/html';
import { withKnobs, boolean, text } from '@storybook/addon-knobs';
import { withMountTrigger, withChatLayout } from 'storybook/decorators';
import { messageCache, userCache } from 'cache';
import { peerMessageToId } from 'helpers/api';
import { MessagePoll } from 'mocks/storybook';
import { users } from 'mocks/user';
import message from '../message';

const stories = storiesOf('Layout | Message', module)
  .addDecorator(withMountTrigger)
  .addDecorator(withChatLayout)
  .addDecorator(withKnobs);

stories.add('Poll', () => {
  MessagePoll.out = boolean('Out', false);
  const poll = MessagePoll.media as MessageMedia.messageMediaPoll;
  poll.poll.question = text('Question', 'Tea lovers! What is your favorite tea?');
  poll.poll.public_voters = boolean('Public voters', false);
  poll.poll.multiple_choice = boolean('Multiple choice', false);
  poll.poll.quiz = boolean('Quiz', false);
  poll.poll.closed = boolean('Closed', false);
  const answers = text('Answers', 'Green Tea, Black Tea, Herbal Tea');
  poll.poll.answers = answers.split(',').map((answer, i) => ({
    _: 'pollAnswer',
    text: answer.trim(),
    option: new Uint8Array([i]).buffer,
  }));

  messageCache.put(MessagePoll);
  userCache.put(users[0]);
  userCache.put(users[1]);

  return message(peerMessageToId(MessagePoll.to_id, MessagePoll.id), new BehaviorSubject([undefined, undefined]));
});
