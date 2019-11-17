import { messageCache } from 'cache';
import { Peer } from 'cache/types';
import { peerMessageToId } from 'helpers/api';
import { profileTitle } from 'components/profile';
import { div, text } from 'core/html';
import './message_reply.scss';

export default function messageReply(peer: Peer, id: number) {
  const msg = messageCache.get(peerMessageToId(peer, id));

  if (!msg) return null;
  if (msg._ === 'messageEmpty') return null;
  if (msg._ === 'messageService') return null;

  let message = '';

  if (msg.media && msg.media._ !== 'messageMediaEmpty') message = 'Media';
  if (msg.message) message = msg.message;

  return (
    div`.reply`(
      div`.reply__content`(
        div`.reply__title`(profileTitle({ _: 'peerUser', user_id: msg.from_id })),
        div`.reply__message${message === 'Media' ? 'media' : ''}`(text(message)),
      ),
    )
  );
}