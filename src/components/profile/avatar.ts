import { div } from 'core/html';
import { Peer, Message } from 'cache/types';
import './avatar.scss';

export default function profileAvatar(peer: Peer, message?: Message) {
  console.log('avatar', peer, message);
  return (
    div`.avatar`(
      div`.avatar__empty`(),
    )
  );
}
