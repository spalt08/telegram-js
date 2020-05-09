/* eslint-disable import/no-extraneous-dependencies,no-console */
import { storiesOf } from '@storybook/html';
import { withMountTrigger, withChatLayout, centered, withKnobWidth } from 'storybook/decorators';
import { select, withKnobs } from '@storybook/addon-knobs';
import { peers } from 'mocks/peer';
import { message } from 'services';
import { peerToId, peerIdToPeer } from 'helpers/api';
import header from './header';

const stories = storiesOf('Layout | History', module)
  .addDecorator(withKnobs)
  .addDecorator(withKnobWidth)
  .addDecorator(centered)
  .addDecorator(withMountTrigger)
  .addDecorator(withChatLayout);

stories.add('Header', () => {
  const peerIds = peers.map(peerToId);
  const peer = select('Peer', peerIds, peerIds[0]);

  message.activePeer.next(peerIdToPeer(peer));

  return header();
});
