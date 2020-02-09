import { Peer } from 'cache/types';
import { user } from 'services';
import { userCache, userFullCache } from 'cache';
import { div, nothing } from 'core/html';
import { useObservable } from 'core/hooks';
import { info, username, phone } from 'components/icons';
import { BehaviorSubject } from 'rxjs';
import { infoListItem } from 'components/ui';
import './peer_info.scss';

export default function peerInfo(peer: Peer) {
  switch (peer._) {
    case 'peerUser': {
      const bioSubject = new BehaviorSubject<string>('');
      const usernameSubject = new BehaviorSubject<string>('');
      const phoneSubject = new BehaviorSubject<string>('');
      const container = div`.peerInfo`(
        infoListItem(info(), 'Bio', bioSubject),
        infoListItem(username(), 'Username', usernameSubject),
        infoListItem(phone(), 'Phone', phoneSubject),
      );

      // fetching user information
      const userByPeer = userCache.get(peer.user_id);
      if (userByPeer) user.loadFullInfo(userByPeer);

      const userSubject = userCache.useItemBehaviorSubject(container, peer.user_id);
      useObservable(container, userSubject, (u) => {
        if (u) {
          usernameSubject.next(u.username || '');
          phoneSubject.next(u.phone ? `+${u.phone}` : '');
        }
      });
      const userFullSubject = userFullCache.useItemBehaviorSubject(container, peer.user_id);
      useObservable(container, userFullSubject, (uf) => {
        if (uf) bioSubject.next(uf.about);
      });

      return container;
    }
    default:
      return nothing;
  }
}
