/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { withKnobs, boolean, text } from '@storybook/addon-knobs';
import { withMountTrigger, withChatLayout } from 'storybook/decorators';
import { Document, DocumentAttribute, Message, MessageMedia, Peer } from 'client/schema';
import { messageCache } from 'cache';

import message from '../message';

const stories = storiesOf('Messages | With Audio', module)
  .addDecorator(withMountTrigger)
  .addDecorator(withChatLayout)
  .addDecorator(withKnobs);

stories.add('Common Usage', () => {
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
        performer: text('Performer', 'Artist'),
        title: text('Title', 'Title'),
        duration: 27,
      } as DocumentAttribute.documentAttributeAudio,
    ],
  };

  const peer = { _: 'peerUser', user_id: 1 } as Peer;
  const msg = {
    _: 'message',
    out: boolean('Out', false),
    id: 1,
    to_id: peer,
    from_id: 1,
    date: Date.now(),
    message: 'test',
    media: { _: 'messageMediaDocument', document: doc } as MessageMedia.messageMediaDocument,
  } as Message.message;
  messageCache.remove('users_1');
  messageCache.put(msg);
  const messageControl = message('users_1', peer);
  return messageControl;
});
