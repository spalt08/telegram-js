import { div, text } from 'core/html';
import { listen, mount, unmountChildren } from 'core/dom';
import { useMessage } from 'cache/hooks';
import { useObservable } from 'core/hooks';
import { Dialog } from 'cache/types';
import { datetime, ripple } from 'components/ui';
import { message, dialog as service } from 'services';
import { pinnedchat } from 'components/icons';
import peerTitle from './peer_title';
import dialogMessage from './dialog_message';
import dialogPicture from './dialog_picture';
import './dialog.scss';

export default function dialogPreview(id: string) {
  const dialog = service.storage[id];

  const { unread_count, peer, pinned } = dialog.value;

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

    console.log('dialog', next);

    if (next.unread_count > 0) badge = div`.dialog__badge`(text(next.unread_count));
    if (next.unread_mark === true && unread_count === 0) badge = div`.dialog__badge`();
    if (next.unread_mentions_count > 0) badge = div`.dialog__badge`(text('@'));
    if (badge && next.notify_settings && next.notify_settings.mute_until > 0) badge.classList.add('muted');
    if (!badge && next.pinned === true) badge = div`.dialog__pin`(pinnedchat({ className: 'icon' }));

    unmountChildren(preview);
    mount(preview, dialogMessage(next.top_message));
    if (badge) mount(preview, badge);

    const msg = useMessage(next.top_message);

    unmountChildren(date);
    mount(date, datetime({ timestamp: msg ? msg.date : 0 }));
  });

  listen(clickable, 'click', () => message.selectPeer(peer));

  return (
    div`.dialog.${pinned ? 'pinned' : ''}`(
      clickable,
    )
  );
}
