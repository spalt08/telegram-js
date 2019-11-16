import { div, text } from 'core/html';
import { listen, mount, unmountChildren } from 'core/dom';
import { useObservable } from 'core/hooks';
import { Dialog } from 'cache/types';
import { dialogCache, messageCache } from 'cache';
import { datetime, ripple } from 'components/ui';
import { message } from 'services';
import { pinnedchat } from 'components/icons';
import { peerMessageToId } from 'helpers/api';
import peerTitle from './peer_title';
import dialogMessage from './dialog_message';
import dialogPicture from './dialog_picture';
import './dialog.scss';

export default function dialogPreview(id: string) {
  const container = div`.dialog`();

  const dialog = dialogCache.useItemBehaviorSubject(container, id);

  const { unread_count, peer, pinned } = dialog.value!;

  if (pinned) container.classList.add('pinned');

  const preview = div`.dialog__preview`();
  const date = div`.dialog__date`();

  const clickable = (
    ripple({ className: 'dialog__clickable' }, [
      dialogPicture(peer),
      div`.dialog__content`(
        div`.dialog__header`(
          div`.dialog__title`(peerTitle(peer)),
          date,
        ),
        preview,
      ),
    ])
  );

  useObservable(clickable, dialog, (next: Dialog) => {
    let badge: HTMLElement | undefined;

    if (next.unread_count > 0) badge = div`.dialog__badge`(text(next.unread_count));
    if (next.unread_mark === true && unread_count === 0) badge = div`.dialog__badge`();
    if (next.unread_mentions_count > 0) badge = div`.dialog__badge`(text('@'));
    if (badge && next.notify_settings && next.notify_settings.mute_until > 0) badge.classList.add('muted');
    if (!badge && next.pinned === true) badge = div`.dialog__pin`(pinnedchat({ className: 'icon' }));

    unmountChildren(preview);
    mount(preview, dialogMessage(next));
    if (badge) mount(preview, badge);

    const msg = messageCache.get(peerMessageToId(next.peer, next.top_message));

    unmountChildren(date);

    if (msg && msg._ !== 'messageEmpty') {
      mount(date, datetime({ timestamp: msg.date }));
    }
  });

  listen(clickable, 'click', () => message.selectPeer(peer));

  mount(container, clickable);
  return div`.dialog__wrapper`(container);
}
