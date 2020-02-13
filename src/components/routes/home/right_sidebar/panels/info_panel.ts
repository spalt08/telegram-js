import { div, text, nothing } from 'core/html';
import { main, auth } from 'services';
import { RightSidebarPanel } from 'services/main';
import roundButton from 'components/ui/round_button/round_button';
import { Peer } from 'cache/types';
import { profileAvatar, profileTitle } from 'components/profile';
import { onlineStatus } from 'components/ui';
import { close, edit, more } from '../../../../icons';
import peerInfo from './peer_info';
import './info_panel.scss';
import mediaPanel from './media_panel';

function hideMyInfo(peer: Peer, node: Node) {
  return (peer._ === 'peerUser' && peer.user_id === auth.userID)
    ? nothing
    : node;
}

export default function infoPanel(peer: Peer) {
  return (
    div`.infoPanel`(
      div`.infoPanel__header`(
        roundButton({ onClick: () => main.setRightSidebarPanel(RightSidebarPanel.None) }, close()),
        div`.infoPanel__title`(text('Info')),
        roundButton({ disabled: true }, edit()),
        roundButton({ disabled: true }, more())),
      div`.infoPanel__avatar`(profileAvatar(peer, undefined, true)),
      div`.infoPanel__name`(profileTitle(peer, true)),
      hideMyInfo(peer, div`.infoPanel__status`(onlineStatus(peer))),
      hideMyInfo(peer, peerInfo(peer)),
      mediaPanel(peer),
    )
  );
}
