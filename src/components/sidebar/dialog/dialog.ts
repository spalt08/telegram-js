import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
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
  const container = div`.dialog__wrapper`(
    div`.dialog`(
      clickable,
    ),
  );

  const isSelectedObservable = message.activePeer.pipe(
    map((activePeer) => !!activePeer && peerToId(activePeer) === id),
    distinctUntilChanged(),
  );

  const applyDialogView = (dialog: Dialog | undefined, isPinned: boolean) => {
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

    if (badgeText !== undefined) {
      unmount(pin);

      badge.textContent = badgeText;
      badge.classList.toggle('muted', isBadgeMuted);
      if (!badge.parentNode) {
        mount(preview, badge);
      }
    } else if (isPinned) {
      unmount(badge);
      if (!pin.parentNode) {
        mount(preview, pin);
      }
    } else {
      unmount(pin);
    }

    container.classList.toggle('-pinned', isPinned);
    badge.classList.toggle('hidden', badgeText === undefined);

    unmountChildren(topMessage);
    mount(topMessage, dialogMessage(dialog));

    // unmountChildren(preview);
    // mount(preview, dialogMessage(next));
    // if (badge) mount(preview, badge);

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
  };

  // on update
  combineLatest([dialogCache.useItemBehaviorSubject(container, id), pinned])
    .pipe(debounceTime(0)) // Dialog and pin updates often go one after another so a debounce is added to batch them
    .subscribe(([dialog, isPinned]) => applyDialogView(dialog, isPinned));

  useObservable(clickable, isSelectedObservable, (selected) => {
    clickable.classList.toggle('-selected', selected);
  });

  listen(clickable, 'click', () => message.selectPeer(peer));

  return container;
}
