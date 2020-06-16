import * as icons from 'components/icons';
import { profileAvatar, profileTitle } from 'components/profile';
import { infoListItem, peerFullStatus } from 'components/ui';
import { mount, unmountChildren } from 'core/dom';
import { useMaybeObservable } from 'core/hooks';
import { div } from 'core/html';
import { MaybeObservable } from 'core/types';
import { isSelf } from 'helpers/api';
import { Peer } from 'mtproto-js';
import './info.scss';
import peerInfo from './peer_info';

export default function infoPanel(peer: MaybeObservable<Peer>) {
  const container = div`.infoPanel`();
  useMaybeObservable(container, peer, true, (newPeer) => {
    unmountChildren(container);
    const info = peerInfo(newPeer);

    mount(info, infoListItem({ icon: () => icons.checkboxon({ className: 'infoPanel__checkbox' }), label: 'Enabled', value: 'Notifications' }));
    mount(container, div`.infoPanel__avatar`(profileAvatar(newPeer, undefined, true)));
    mount(container, div`.infoPanel__name`(profileTitle(newPeer, true)));
    if (!isSelf(newPeer)) {
      mount(container, div`.infoPanel__status`(peerFullStatus(newPeer)));
    }
    mount(container, info);
  });

  return container;
}
