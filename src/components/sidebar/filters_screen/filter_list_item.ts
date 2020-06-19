import { BehaviorSubject, Observable } from 'rxjs';
import { Peer } from 'mtproto-js';
import { MaybeObservable } from 'core/types';
import { div, text } from 'core/html';
import { useMaybeObservable, useObservable } from 'core/hooks';
import { mount, unmountChildren } from 'core/dom';
import { peerToTitle, useWaitForPeerLoaded } from 'cache/accessors';
import { profileAvatar } from 'components/profile';
import * as icons from 'components/icons';
import { auth as authService } from 'services';
import { pluralize } from 'helpers/other';
import './filter_list_item.scss';

export default function filterListItem(
  icon: MaybeObservable<Node | undefined>,
  title: MaybeObservable<string>,
  isHighlighted?: boolean,
  onClick?: () => void,
) {
  const iconContainer = div`.filterListItem__icon`();

  useMaybeObservable(iconContainer, icon, true, (iconNode) => {
    unmountChildren(iconContainer);
    if (iconNode) {
      mount(iconContainer, iconNode);
    }
  });

  return (
    div`.filterListItem ${isHighlighted ? '-highlight' : ''} ${onClick ? '-clickable' : ''}`(
      { onClick },
      iconContainer,
      div`.filterListItem__title`(text(title)),
    )
  );
}

export function peerFilterListItem(peer: Peer) {
  const [, title] = peerToTitle(peer, authService.userID);
  const icon = new BehaviorSubject<Node | undefined>(undefined);

  const item = filterListItem(icon, title);

  useWaitForPeerLoaded(item, peer, () => icon.next(profileAvatar(peer, undefined, true)));

  return item;
}

export function expandButtonFilterListItem(state: Observable<{ isExpanded: boolean, collapseCount: number }>, onClick?: () => void) {
  const icon = icons.down();
  const title = new BehaviorSubject('');
  const item = filterListItem(icon, title, false, onClick);

  useObservable(item, state, true, ({ isExpanded, collapseCount }) => {
    icon.classList.toggle('-reverse', isExpanded);
    title.next(`${isExpanded ? 'Hide' : 'Show'} ${collapseCount} ${isExpanded ? '' : 'more'} ${pluralize(collapseCount, 'chat', 'chats')}`);
  });

  return item;
}
