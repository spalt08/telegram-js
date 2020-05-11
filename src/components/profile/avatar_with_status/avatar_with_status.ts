import { Message, Peer, User } from 'mtproto-js';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { div, nothing } from 'core/html';
import { userCache } from 'cache';
import client from 'client/client';
import avatar from '../avatar/avatar';
import './avatar_with_status.scss';

interface Props {
  peer: Peer;
  message?: Message;
  forDialogList?: boolean;
  className?: string;
}

function inOnline(user: User | undefined) {
  return user?._ === 'user' && user.status?._ === 'userStatusOnline' && user.id !== client.getUserID();
}

function status(peer: Peer) {
  if (peer._ !== 'peerUser') {
    return nothing;
  }

  const element = div`.avatarWithStatus__status`();
  const userSubject = userCache.useItemBehaviorSubject(element, peer.user_id);

  userSubject
    .pipe(map(inOnline), distinctUntilChanged())
    .subscribe((online) => element.classList.toggle('-online', online));

  return element;
}

export default function avatarWithStatus({ peer, message, forDialogList, className = '' }: Props) {
  return div`.avatarWithStatus ${className}`(
    avatar(peer, message, forDialogList),
    status(peer),
  );
}
