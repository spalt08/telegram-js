import { div, text } from 'core/html';
import { el } from 'core/dom';
import './info_panel.scss';
import roundButton from 'components/ui/round_button/round_button';
import { close, edit, more } from '../../../../icons';

export default function infoPanel() {
  return (
    div`.info_panel`(
      div`.info_panel__header`(
        roundButton({ className: 'header_button close_button' }, close()),
        div`.info_panel__title`(el('h4', {}, [text('Info')])),
        roundButton({ className: 'header_button edit_button' }, edit()),
        roundButton({ className: 'header_button more_button' }, more())),
      div(text('avatar')),
      div(text('name')),
      div(text('status')),
      div(text('info')),
      div(text('media')))
  );
}
