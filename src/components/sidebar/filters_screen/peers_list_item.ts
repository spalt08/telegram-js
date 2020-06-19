import { map } from 'rxjs/operators';
import { Peer } from 'mtproto-js';
import { MaybeObservable } from 'core/types';
import { div, nothing, text } from 'core/html';
import { useMaybeObservable } from 'core/hooks';
import { mount, unmountChildren } from 'core/dom';
import { ripple } from 'components/ui';
import * as icons from 'components/icons';
import { peerToTitle } from 'cache/accessors';
import { auth as authService } from 'services';
import { profileAvatar } from 'components/profile';
import './peers_list_item.scss';
import { userCache } from '../../../cache';

export default function peersListItem(
  icon: MaybeObservable<Node | undefined>,
  title: MaybeObservable<string | undefined>,
  description: MaybeObservable<string | undefined>,
  isChecked: MaybeObservable<boolean>,
  onClick: () => void,
) {
  const iconContainer = div`.filterPeersItem__icon`();
  const checkmark = div`.filterPeersItem__check`(icons.check());

  useMaybeObservable(iconContainer, icon, true, (iconNode) => {
    unmountChildren(iconContainer);
    if (iconNode) {
      mount(iconContainer, iconNode);
    }
  });

  useMaybeObservable(checkmark, isChecked, true, (checked) => {
    checkmark.classList.toggle('-checked', checked);
  });

  return (
    div`.filterPeersItem`(
      ripple({
        className: 'filterPeersItem__ripple',
        contentClass: 'filterPeersItem__content',
        onClick,
      }, [
        iconContainer,
        div`.filterPeersItem__body`(
          title ? div`.filterPeersItem__title`(text(title)) : nothing,
          description ? div`.filterPeersItem__description`(text(description)) : nothing,
        ),
        checkmark,
      ]),
    )
  );
}

export function peerPeersListItem(peer: Peer, isChecked: MaybeObservable<boolean>, onClick: () => void) {
  const avatar = profileAvatar(peer, undefined, true);
  const [, title] = peerToTitle(peer, authService.userID);
  let description: MaybeObservable<string> = '';

  switch (peer._) {
    case 'peerUser':
      description = userCache.useItemBehaviorSubject(avatar, peer.user_id).pipe(map((user) => {
        if (user?._ !== 'user') {
          return ' '; // nbps here
        }
        if (user.bot) {
          return 'Bot';
        }
        if (user.contact) {
          return 'Contact';
        }
        return 'Non-Contact';
      }));
      break;
    case 'peerChat':
      description = 'Group';
      break;
    case 'peerChannel':
      description = 'Channel';
      break;
    default:
  }

  return peersListItem(avatar, title, description, isChecked, onClick);
}
