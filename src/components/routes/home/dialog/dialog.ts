import { div, text } from 'core/html';
import { Dialog } from 'cache/types';
import { listen } from 'core/dom';
import { useMessage } from 'cache/hooks';
import { datetime, ripple } from 'components/ui';
import { message } from 'services';
import peerTitle from './peer_title';
import './dialog.scss';

export default function dialogPreview({ peer, unread_count, unread_mentions_count, unread_mark, top_message }: Dialog) {
  const msg = useMessage(top_message);

  let badge = div();

  if (unread_count > 0) badge = div`.dialog__badge`(text(unread_count));
  if (unread_mark === true && unread_count === 0) badge = div`.dialog__badge`();
  if (unread_mentions_count > 0) badge = div`.dialog__badge`(text('@'));

  const clickable = (
    ripple({ className: 'dialog__clickable' }, [
      div`.dialog__picture`(
        div`.dialog__picempty`(),
      ),
      div`.dialog__content`(
        div`.dialog__header`(
          div`.dialog__title`(peerTitle(peer)),
          div`.dialog__date`(
            datetime({ timestamp: msg ? msg.date : 0 }),
          ),
        ),
        div`.dialog__preview`(
          div`.dialog__message`(
            text(msg ? (msg.message || '') : ''),
          ),
          badge,
        ),
      ),
    ])
  );

  listen(clickable, 'click', () => message.selectPeer(peer));

  return (
    div`.dialog`(
      clickable,
    )
  );
}
