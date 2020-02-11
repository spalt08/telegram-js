import { div, text } from 'core/html';
import { main } from 'services';
import { RightSidebarPanel } from 'services/main';
import roundButton from 'components/ui/round_button/round_button';
import { Peer } from 'cache/types';
import { profileAvatar, profileTitle } from 'components/profile';
import { onlineStatus } from 'components/ui';
import { close, edit, more } from '../../../../icons';
import peerInfo from './peer_info';
import './info_panel.scss';

export default function infoPanel(peer: Peer) {
  return (
    div`.infoPanel`(
      div`.infoPanel__header`(
        roundButton({ className: 'header_button close_button', onClick: () => main.setRightSidebarPanel(RightSidebarPanel.None) }, close()),
        div`.infoPanel__title`(text('Info')),
        roundButton({ disabled: true }, edit()),
        roundButton({ disabled: true }, more())),
      div`.infoPanel__avatar`(profileAvatar(peer)),
      div`.infoPanel__name`(profileTitle(peer)),
      div`.infoPanel__status`(onlineStatus(peer)),
      peerInfo(peer))
  );
}
