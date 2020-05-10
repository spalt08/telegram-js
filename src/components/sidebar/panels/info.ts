import { Peer } from 'mtproto-js';
import { div, nothing } from 'core/html';
import { mount } from 'core/dom';
import { profileAvatar, profileTitle } from 'components/profile';
import { peerFullStatus, infoListItem } from 'components/ui';
import * as icons from 'components/icons';
import { isSelf } from 'helpers/api';
import peerInfo from './peer_info';
import './info.scss';

export default function infoPanel(peer: Peer) {
  const info = peerInfo(peer);

  mount(info, infoListItem({ icon: () => icons.checkboxon({ className: 'infoPanel__checkbox' }), label: 'Enabled', value: 'Notifications' }));

  return div`.infoPanel`(
    div`.infoPanel__avatar`(profileAvatar(peer, undefined, true)),
    div`.infoPanel__name`(profileTitle(peer, true)),
    !isSelf(peer) ? div`.infoPanel__status`(peerFullStatus(peer)) : nothing,
    info,
  );
}
