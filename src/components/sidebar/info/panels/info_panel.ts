import { useObservable } from 'core/hooks';
import { div } from 'core/html';
import { unmountChildren, mount } from 'core/dom';
import { profileAvatar, profileTitle } from 'components/profile';
import { peerFullStatus, infoListItem } from 'components/ui';
import * as icons from 'components/icons';
import { message } from 'services';
import { isSelf } from 'helpers/api';
import peerInfo from './peer_info';
import './info_panel.scss';

export default function infoPanel() {
  const container = div`.infoPanel`();

  useObservable(container, message.activePeer, (peer) => {
    unmountChildren(container);
    if (!peer) return;

    mount(container, div`.infoPanel__avatar`(profileAvatar(peer, undefined, true)));
    mount(container, div`.infoPanel__name`(profileTitle(peer, true)));

    if (!isSelf(peer)) mount(container, div`.infoPanel__status`(peerFullStatus(peer)));

    const info = peerInfo(peer);

    mount(info, infoListItem({ icon: () => icons.checkboxon({ className: 'infoPanel__checkbox' }), label: 'Enabled', value: 'Notifications' }));
    mount(container, info);
  });

  return container;
}
