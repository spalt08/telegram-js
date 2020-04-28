import { Message, Peer } from 'mtproto-js';
import { div } from 'core/html';
import { userCache } from 'cache';
import { auth } from 'services';
import avatar from '../avatar/avatar';
import './avatar_with_status.scss';

interface Props {
  peer: Peer;
  message?: Message;
  forDialogList?: boolean;
  className?: string;
}

function status(peer: Peer) {
  const container = div`.avatarWithStatus__status`();

  if (peer._ === 'peerUser') {
    const userSubject = userCache.useItemBehaviorSubject(container, peer.user_id);
    userSubject.subscribe((user) => {
      const isOnline = user && user._ === 'user' && user.status?._ === 'userStatusOnline' && user.id !== auth.userID;
      container.classList.toggle('-online', isOnline);
    });
  }

  return container;
}

export default function avatarWithStatus({ peer, message, forDialogList, className = '' }: Props) {
  return div`.avatarWithStatus ${className}`(
    avatar(peer, message, forDialogList),
    status(peer),
  );
}
