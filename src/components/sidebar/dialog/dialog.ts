import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { Dialog } from 'mtproto-js';
import { div } from 'core/html';
import { listen, mount, unmountChildren, unmount } from 'core/dom';
import { useObservable } from 'core/hooks';
import { dialogCache, messageCache } from 'cache';
import { datetime, ripple } from 'components/ui';
import { message } from 'services';
import { pinnedchat } from 'components/icons';
import { dialogIdToPeer, isDialogMuted, peerMessageToId, peerToId } from 'helpers/api';
import { avatarWithStatus, profileTitle } from 'components/profile';
import dialogMessage from './dialog_message';
import './dialog.scss';

export default function dialogPreview(id: string, pinned: Observable<boolean> = new BehaviorSubject(false)) {
  const peer = dialogIdToPeer(id);
  if (!peer) {
    throw new Error(`The dialog id "${id}" isn't a dialog id`);
  }

  const date = div`.dialog__date`();
  const badge = div`.dialog__badge.hidden`();
  const topMessage = div`.dialog__message`();
  const pin = div`.dialog__pin`(pinnedchat({ className: 'icon' }));
  const preview = div`.dialog__preview`(topMessage, badge);

  const clickable = (
    ripple({ className: 'dialog__clickable', contentClass: 'dialog__clickable_content' }, [
      avatarWithStatus({ peer, className: 'dialog__picture', forDialogList: true }),
      div`.dialog__content`(
        div`.dialog__header`(
          div`.dialog__title`(profileTitle(peer, true)),
          date,
        ),
        preview,
      ),
    ])
  );
  const container = (
    div`.dialog`(
      clickable,
    )
  );

  function leaveOnlyOneBadge() {
    if (!badge.classList.contains('hidden')) {
      if (!badge.parentNode) {
        mount(preview, badge);
      }
      pin.style.display = 'none';
    } else if (pin.parentNode) {
      unmount(badge);
      pin.style.display = '';
    } else {
      // eslint-disable-next-line no-lonely-if
      if (!badge.parentNode) {
        mount(preview, badge);
      }
    }
  }

  function applyDetailsUI(dialog?: Dialog) {
    if (dialog?._ !== 'dialog') {
      return;
    }

    let badgeText: string | undefined;
    let isBadgeMuted = false;

    if (dialog.unread_count > 0) {
      badgeText = dialog.unread_count.toString();
    }
    if (dialog.unread_mark && dialog.unread_count === 0) {
      badgeText = '';
    }
    if (dialog.unread_mentions_count > 0) {
      badgeText = '@';
    }
    if (isDialogMuted(dialog)) {
      isBadgeMuted = true;
    }

    badge.classList.toggle('hidden', badgeText === undefined);

    if (badgeText !== undefined) {
      badge.textContent = badgeText;
      badge.classList.toggle('muted', isBadgeMuted);
      if (!badge.parentNode) {
        mount(preview, badge);
      }
    }

    leaveOnlyOneBadge();

    unmountChildren(topMessage);
    mount(topMessage, dialogMessage(dialog));

    const msg = messageCache.get(peerMessageToId(dialog.peer, dialog.top_message));

    if (msg && msg._ !== 'messageEmpty') {
      date.textContent = datetime({ timestamp: msg.date }).textContent;

      if (msg.out) date.classList.add('out');
      else if (date.classList.contains('out')) date.classList.remove('out');

      if (msg.out && msg.id > dialog.read_outbox_max_id) date.classList.add('unread');
      else if (date.classList.contains('unread')) date.classList.remove('unread');
    } else {
      date.textContent = '';
    }
  }

  function applyPinUI(isPinned: boolean) {
    // Only this function mounts and unmounts the pin
    if (isPinned) {
      if (!pin.parentNode) {
        mount(preview, pin);
      }
    } else {
      unmount(pin);
    }

    leaveOnlyOneBadge();
  }

  const isSelectedObservable = message.activePeer.pipe(
    map((activePeer) => !!activePeer && peerToId(activePeer) === id),
    distinctUntilChanged(),
  );

  dialogCache.useItemBehaviorSubject(container, id).subscribe(applyDetailsUI);

  useObservable(clickable, pinned, applyPinUI);

  useObservable(clickable, isSelectedObservable, (selected) => {
    clickable.classList.toggle('-selected', selected);
  });

  listen(clickable, 'mousedown', () => message.selectPeer(peer));

  return container;
}
