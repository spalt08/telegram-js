import { div, text } from 'core/html';
import { el } from 'core/dom';
import './info_panel.scss';
import roundButton from 'components/ui/round_button/round_button';
import { Peer } from 'cache/types';
import { profileAvatar, profileTitle } from 'components/profile';
import { onlineStatus } from 'components/ui/online_status/online_status';
import { close, edit, more } from '../../../../icons';

export default function infoPanel(peer: Peer) {
  return (
    div`.info_panel`(
      div`.info_panel__header`(
        roundButton({ className: 'header_button close_button' }, close()),
        div`.info_panel__title`(el('h4', {}, [text('Info')])),
        roundButton({}, edit()),
        roundButton({}, more())),
      div`.info_panel__avatar`(profileAvatar(peer)),
      div`.info_panel__name`(el('h3', {}, [profileTitle(peer)])),
      div`.info_panel__status`(onlineStatus(peer)),
      div`.info_panel__info`(text('info')))
  );
}
