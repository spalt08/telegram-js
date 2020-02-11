import { div, text } from 'core/html';
import { main, RightSidebarPanel } from 'services';
import roundButton from 'components/ui/round_button/round_button';
import { Peer } from 'cache/types';
import { close } from '../../../../icons';
import './search_panel.scss';

export default function searchPanel(_peer: Peer) {
  return (
    div`.searchPanel`(
      div`.searchPanel__header`(
        roundButton({ className: 'header_button close_button', onClick: () => main.setRightSidebarPanel(RightSidebarPanel.None) }, close()),
        div`.searchPanel__title`(text('Search input')),
      ),
    )
  );
}
