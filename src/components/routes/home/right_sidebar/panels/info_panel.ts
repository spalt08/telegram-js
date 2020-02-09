import { div, text } from 'core/html';
import { main } from 'services';
import roundButton from 'components/ui/round_button/round_button';
import { Peer } from 'cache/types';
import { profileAvatar, profileTitle } from 'components/profile';
import { onlineStatus } from 'components/ui';
import { close, edit, more } from '../../../../icons';
import peerInfo from './peer_info';
import './info_panel.scss';

export default function infoPanel(peer: Peer) {
  function closeSidebar() {
    main.toggleRightSidebar();
  }

  return (
    div`.info_panel`(
      div`.info_panel__header`(
        roundButton({ className: 'header_button close_button', onClick: closeSidebar }, close()),
        div`.info_panel__title`(text('Info')),
        roundButton({}, edit()),
        roundButton({}, more())),
      div`.info_panel__avatar`(profileAvatar(peer)),
      div`.info_panel__name`(profileTitle(peer)),
      div`.info_panel__status`(onlineStatus(peer)),
      peerInfo(peer))
  );
}
