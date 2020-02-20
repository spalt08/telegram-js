import { div } from 'core/html';
import { Peer } from 'cache/types';
import { profileAvatar } from 'components/profile';
import { userCache } from 'cache';
import { auth } from 'services';

function status(peer: Peer) {
  const container = div`.dialog__status`();
  if (peer._ === 'peerUser') {
    const userSubject = userCache.useItemBehaviorSubject(container, peer.user_id);
    userSubject.subscribe((user) => {
      const isOnline = user?._ === 'user' && user?.status?._ === 'userStatusOnline' && user?.id !== auth.userID;
      container.classList.toggle('online', user && isOnline);
    });
  }

  return container;
}

export default function dialogPicture(peer: Peer) {
  const container = div`.dialog__picture`(
    profileAvatar(peer, undefined, true),
    status(peer),
  );

  return container;
}
