import { map } from 'rxjs/operators';
import { div, text } from 'core/html';
import { Dialog } from 'cache/types';
import { listen, mount } from 'core/dom';
import { messageCache } from 'cache';
import { datetime, ripple } from 'components/ui';
import { message } from 'services';
import peerTitle from './peer_title';
import './dialog.scss';

export default function dialogPreview({ peer, unread_count, unread_mentions_count, unread_mark, top_message }: Dialog) {
  // todo: Watch the dialog itself updates

  const element = div`.dialog`();

  let badge = div();

  if (unread_count > 0) badge = div`.dialog__badge`(text(unread_count));
  if (unread_mark === true && unread_count === 0) badge = div`.dialog__badge`();
  if (unread_mentions_count > 0) badge = div`.dialog__badge`(text('@'));

  const topMessageSubject = messageCache.useItemBehaviorSubject(element, top_message);

  const clickable = (
    ripple({ className: 'dialog__clickable' }, [
      div`.dialog__picture`(
        div`.dialog__picempty`(),
      ),
      div`.dialog__content`(
        div`.dialog__header`(
          div`.dialog__title`(peerTitle(peer)),
          div`.dialog__date`(
            datetime({
              timestamp: topMessageSubject.pipe(map((msg) => msg ? msg.date : 0)),
            }),
          ),
        ),
        div`.dialog__preview`(
          div`.dialog__message`(
            text(topMessageSubject.pipe(map((msg) => msg ? (msg.message || '') : ''))),
          ),
          badge,
        ),
      ),
    ])
  );

  listen(clickable, 'click', () => message.selectPeer(peer));

  mount(element, clickable);
  return element;
}
