/* eslint-disable import/no-extraneous-dependencies,no-console */
import { storiesOf } from '@storybook/html';
import { withMountTrigger, fullscreen } from 'storybook/decorators';
import { select, withKnobs } from '@storybook/addon-knobs';
import { peers } from 'mocks/peer';
import { message } from 'services';
import { peerToId, peerIdToPeer } from 'helpers/api';
import history from './history';

const stories = storiesOf('Layout | History', module)
  .addDecorator(withKnobs)
  .addDecorator(fullscreen)
  .addDecorator(withMountTrigger);

const element = history({ onBackToContacts: () => {} });

stories.add('Overall', () => {
  const peerIds = peers.map(peerToId);
  const peer = select('Peer', peerIds, peerIds[0]);

  message.activePeer.next(peerIdToPeer(peer));

  return element;
});
