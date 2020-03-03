/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { withMountTrigger, withChamomileBackground } from 'storybook/decorators';
import { Document, DocumentAttribute, Message, MessageMedia, Peer } from 'cache/types';
import { messageCache } from 'cache';

import message from './message';

const stories = storiesOf('III. Messages | Audio Message', module)
  .addDecorator(withMountTrigger)
  .addDecorator(withChamomileBackground)
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
      performer: 'Artist',
      title: 'Title',
      duration: 27,
    } as DocumentAttribute.documentAttributeAudio,
  ],
};

stories.add('Common Usage', () => {
  const peer = { _: 'peerUser', user_id: 1 } as Peer;
  const msg = {
    _: 'message',
    out: false,
    id: 1,
    to_id: peer,
    date: Date.now(),
    message: 'test',
    media: { _: 'messageMediaDocument', document: doc } as MessageMedia.messageMediaDocument,
  } as Message.message;
  messageCache.remove('users_1');
  messageCache.put(msg);
  const messageControl = message('users_1', peer);
  return messageControl;
});
