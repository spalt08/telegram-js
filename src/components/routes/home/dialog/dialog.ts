import { div, text } from 'core/html';
import { Dialog } from 'cache/types';
import { useMessage } from 'cache/hooks';
import peerTitle from './peer_title';
import './dialog.scss';

export default function dialogPreview({ peer, top_message }: Dialog) {
  const msg = useMessage(top_message);

  return (
    div`.dialog`(
      div`.dialog__picture`(
        div`.dialog__picempty`(),
      ),
      div`.dialog__content`(
        div`.dialog__header`(
          div`.dialog__title`(peerTitle(peer)),
          div`.dialog__date`(
            text(msg ? msg.date : 0),
          ),
        ),
        div`.dialog__preview`(
          text(msg ? msg.message : ''),
        ),
      ),
    )
  );
}
