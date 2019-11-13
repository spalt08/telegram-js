import { div, text } from 'core/html';
import { Dialog } from 'cache/types';
import { datetime, ripple } from 'components/ui';
import { useMessage } from 'cache/hooks';
import peerTitle from './peer_title';
import './dialog.scss';

export default function dialogPreview({ peer, unread_count, unread_mentions_count, unread_mark, top_message }: Dialog) {
  const msg = useMessage(top_message);

  // const badge
  // { unread_mentioned > 0 ? (
  //   <div className={classes.badge}>@</div>
  // ) : (
  //   (unread || unread_count > 0) && <div className={classes.badge}>{unread_count > 0 ? unread_count : ''}</div>
  // )}
  let badge = div();

  if (unread_count > 0) badge = div`.dialog__badge`(text(unread_count));
  if (unread_mark === true && unread_count === 0) badge = div`.dialog__badge`();
  if (unread_mentions_count > 0) badge = div`.dialog__badge`(text('@'));

  return (
    div`.dialog`(
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
      ]),
    )
  );
}
