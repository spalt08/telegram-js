import { Peer, UserFull } from 'cache/types';
import { userCache } from 'cache';
import { div, text, nothing } from 'core/html';
import { useObservable } from 'core/hooks';
import client from 'client/client';
import { info, username, phone } from 'components/icons';
import './peer_info.scss';

export default function peerInfo(peer: Peer) {
  switch (peer._) {
    case 'peerUser': {
      const bioElement = text('');
      const usernameElement = text('');
      const phoneElement = text('');
      const container = div`.peerInfo`(
        div`.peerInfo__row`(
          div`.icon`(info()),
          div(
            div`.value`(bioElement),
            div`.hint`(text('Bio')),
          ),
        ),
        div`.peerInfo__row`(
          div`.icon`(username()),
          div(
            div`.value`(usernameElement),
            div`.hint`(text('Username')),
          ),
        ),
        div`.peerInfo__row`(
          div`.icon`(phone()),
          div(
            div`.value`(phoneElement),
            div`.hint`(text('Phone')),
          ),
        ),
      );
      const userSubject = userCache.useItemBehaviorSubject(container, peer.user_id);
      useObservable(container, userSubject, (u) => {
        if (u) {
          usernameElement.textContent = u.username || '';
          phoneElement.textContent = u.phone || '';
          if (!u.info) {
            const payload = {
              id: { _: 'inputUser', user_id: u.id, access_hash: u.access_hash },
            };
            client.call('users.getFullUser', payload, (err, userFull: UserFull) => {
              bioElement.textContent = userFull.about;
            });
          }
        }
      });
      return container;
    }
    default:
      return nothing;
  }
}
