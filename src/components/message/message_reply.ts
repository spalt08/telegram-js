import { messageCache } from 'cache';
import { Peer } from 'cache/types';
import { peerMessageToId } from 'helpers/api';
import { profileTitle } from 'components/profile';
import { text } from 'core/html';
import { message as service } from 'services';
import './message_reply.scss';
import { listen } from 'core/dom';
import { quote } from 'components/ui';

export default function messageReply(peer: Peer, id: number) {
  const msg = messageCache.get(peerMessageToId(peer, id));

  if (!msg) return null;
  if (msg._ === 'messageEmpty') return null;
  if (msg._ === 'messageService') return null;

  let message = '';

  if (msg.media && msg.media._ !== 'messageMediaEmpty') message = 'Media';
  if (msg.message) message = msg.message;

  const element = quote(
    profileTitle({ _: 'peerUser', user_id: msg.from_id }),
    text(message),
  );

  listen(element, 'click', () => service.selectPeer(peer, id));

  return element;
}
