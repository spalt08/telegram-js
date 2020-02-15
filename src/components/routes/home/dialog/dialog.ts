import { distinctUntilChanged, map } from 'rxjs/operators';
import { div, text } from 'core/html';
import { listen, mount, unmountChildren, unmount } from 'core/dom';
import { useObservable } from 'core/hooks';
import { dialogCache, messageCache } from 'cache';
import { datetime, ripple } from 'components/ui';
import { message } from 'services';
import { pinnedchat } from 'components/icons';
import { peerMessageToId, peerToId } from 'helpers/api';
import { profileTitle } from 'components/profile';
import { Dialog } from 'cache/types';
import dialogMessage from './dialog_message';
import dialogPicture from './dialog_picture';
import './dialog.scss';

export default function dialogPreview(id: string) {
  const container = div`.dialog`();

  const dialog = dialogCache.useItemBehaviorSubject(container, id);

  const { peer, pinned } = dialog.value!;

  const date = div`.dialog__date`();

  const badge = div`.dialog__badge.hidden`();
  const topMessage = div`.dialog__message`();
  const pin = div`.dialog__pin`(pinnedchat({ className: 'icon' }));
  const preview = div`.dialog__preview`(topMessage, badge);

  const clickable = (
    ripple({ className: 'dialog__clickable', contentClass: 'dialog__clickable_content' }, [
      dialogPicture(peer),
      div`.dialog__content`(
        div`.dialog__header`(
          div`.dialog__title`(profileTitle(peer, true)),
          date,
        ),
        preview,
      ),
    ])
  );

  const isSelectedObservable = message.activePeer.pipe(
    map((activePeer) => !!(activePeer && peerToId(activePeer) === id)),
    distinctUntilChanged(),
  );

  // on update
  useObservable(clickable, dialog, (next: Dialog) => {
    if (next.unread_count === 0) {
      badge.textContent = '';
      if (!badge.classList.contains('hidden')) badge.classList.add('hidden');
    }

    if (next.unread_count > 0) {
      badge.textContent = next.unread_count.toString();
      if (badge.classList.contains('hidden')) badge.classList.remove('hidden');
    }

    if (next.unread_mark === true && next.unread_count === 0) {
      badge.textContent = '';
      if (badge.classList.contains('hidden')) badge.classList.remove('hidden');
    }

    if (next.unread_mentions_count > 0) {
      badge.textContent = '@';
      if (badge.classList.contains('hidden')) badge.classList.remove('hidden');
    }

    if (next.notify_settings && next.notify_settings.mute_until > 0) badge.classList.add('muted');
    else badge.classList.remove('muted');

    if (next.pinned === true) {
      if (badge.textContent === '' && !pin.parentElement) {
        unmount(badge);
        mount(preview, pin);
      }

      if (badge.textContent !== '' && pin.parentElement) {
        unmount(pin);
        mount(preview, badge);
      }
    }

    unmountChildren(topMessage);
    mount(topMessage, dialogMessage(next));

    // unmountChildren(preview);
    // mount(preview, dialogMessage(next));
    // if (badge) mount(preview, badge);

    const msg = messageCache.get(peerMessageToId(next.peer, next.top_message));

    if (msg && msg._ !== 'messageEmpty') {
      date.textContent = datetime({ timestamp: msg.date }).textContent;

      if (msg.out === true) date.classList.add('out');
      else if (date.classList.contains('out')) date.classList.remove('out');

      if (msg.out === true && msg.id > next.read_outbox_max_id) date.classList.add('unreaded');
      else if (date.classList.contains('unreaded')) date.classList.remove('unreaded');
    } else {
      date.textContent = '';
    }

    // hadnle last pin
    if (pinned && container.parentElement && container.parentElement.previousSibling instanceof HTMLElement) {
      const prev = container.parentElement.previousSibling;
      if (prev.classList.contains('lastpin')) prev.classList.remove('lastpin');
      if (!container.parentElement.classList.contains('lastpin')) container.parentElement.classList.add('lastpin');
    }

    if (!pinned && container.parentElement && container.parentElement.classList.contains('lastpin')) {
      container.parentElement.classList.remove('lastpin');
    }
  });

  useObservable(clickable, isSelectedObservable, (isSelected) => {
    clickable.classList.toggle('-selected', isSelected);
  });

  listen(clickable, 'click', () => message.selectPeer(
    peer,

    // Scroll to the bottom when a selected dialog is clicked
    message.activePeer.value && peerToId(message.activePeer.value) === id ? Infinity : undefined,
  ));

  mount(container, clickable);

  return div`.dialog__wrapper${pinned ? 'lastpin' : ''}`(container);
}
