/* eslint-disable import/no-extraneous-dependencies */
import { Message, Peer } from 'mtproto-js';
import { LoremIpsum } from 'lorem-ipsum';

const lorem = new LoremIpsum({
  sentencesPerParagraph: {
    max: 8,
    min: 4,
  },
  wordsPerSentence: {
    max: 16,
    min: 4,
  },
});

const msgInitialCounter = 0xFFFFFFF;
let msgIdCounter = msgInitialCounter;

export function mockMessage({
  from_id,
  to_id,
  message = lorem.generateSentences(1),
  out = false,
  mentioned = false,
  media_unread = false,
  silent = false,
  post = false,
  from_scheduled = false,
  legacy = false,
  edit_hide = false,
  via_bot_id = 0,
  reply_to_msg_id = 0,
  entities = [],
  views = 0,
  edit_date = 0,
  post_author = '',
  grouped_id = '',
  restriction_reason = [],
  date = 0,
  media = undefined,
}: Partial<Message.message> & { from_id: number, to_id: Peer }): Message.message {
  return {
    _: 'message',
    out,
    mentioned,
    media_unread,
    silent,
    post,
    from_scheduled,
    legacy,
    edit_hide,
    id: msgIdCounter--,
    from_id,
    to_id,
    via_bot_id,
    reply_to_msg_id,
    date: date || (Date.now() / 1000 - msgIdCounter),
    message,
    entities,
    views,
    edit_date,
    post_author,
    grouped_id,
    restriction_reason,
    media,
  };
}
