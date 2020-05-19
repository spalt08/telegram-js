import binarySearch from 'binary-search';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { button, div, text } from 'core/html';
import { mount, unmount } from 'core/dom';
import { useObservable } from 'core/hooks';
import { message as service, dialog as dialogService } from 'services';
import { Direction as MessageDirection } from 'services/message/types';
import message from 'components/message/message';
import { sectionSpinner, VirtualizedList } from 'components/ui';
import * as icons from 'components/icons';
import messageInput from 'components/message/input/input';
import { Peer } from 'mtproto-js';
import { compareSamePeerMessageIds, peerMessageToId, peerToId } from 'helpers/api';
import { messageCache, dialogCache, chatCache, messageGroupMap } from 'cache';
import header from './header/header';
import './history.scss';
import historyDay from './history_day/history_day';

function prepareIdsList(peer: Peer, messageIds: Readonly<number[]>): string[] {
  const { length } = messageIds;
  const reversed = new Array(length);
  for (let i = 0; i < length; i += 1) {
    reversed[length - i - 1] = peerMessageToId(peer, messageIds[i]);
  }
  return reversed;
}

export default function history() {
  const welcome = div`.history__welcome`(div`.history__welcome-text`(text('Select a chat to start messaging')));
  const container = div`.history`(welcome);
  const showDownButton = new BehaviorSubject(false);

  let spinner: Node | undefined;
  let scroll: VirtualizedList;

  const itemsSubject = new BehaviorSubject<string[]>([]);
  const showSpinnerObservable = combineLatest([service.history, service.loadingNextChunk])
    .pipe(map(([{ ids, loadingNewer, loadingOlder }, loadingNextChunk]) => (
      loadingNextChunk || ((loadingNewer || loadingOlder) && ids.length < 3)
    )));

  function getMessageIndex(messageId: string): number {
    const rawValue = binarySearch(itemsSubject.value, messageId, compareSamePeerMessageIds);
    return rawValue >= 0 ? rawValue : (-rawValue - 1.5);
  }

  function updateDownButtonState(bottomVisibleMessageId: string) {
    const showDown = !service.history.value.newestReached || itemsSubject.value[itemsSubject.value.length - 1] !== bottomVisibleMessageId;
    if (showDown !== showDownButton.value) {
      showDownButton.next(showDown);
    }
  }

  function reportRead(newestReadMessageId: number) {
    dialogService.reportMessageRead(
      service.activePeer.value!,
      newestReadMessageId,
    );
  }

  function updateUnreadCounter(newestReadMessageId: number) {
    const peer = service.activePeer.value!;
    const dialog = dialogCache.get(peerToId(peer));
    if (dialog?._ !== 'dialog' || newestReadMessageId <= dialog.read_inbox_max_id) {
      return;
    }

    let { unread_count } = dialog;

    if (newestReadMessageId === dialog.top_message) {
      unread_count = 0;
    } else {
      const lastReadMessageIndex = getMessageIndex(peerMessageToId(peer, dialog.read_inbox_max_id));
      const newReadMessageIndex = getMessageIndex(peerMessageToId(peer, newestReadMessageId));
      for (let i = Math.floor(lastReadMessageIndex) + 1; i <= newReadMessageIndex; i++) {
        const msg = messageCache.get(scroll.items[i]);
        if (msg && msg._ !== 'messageEmpty' && !msg.out) unread_count--;
      }
    }

    dialogCache.put({
      ...dialog,
      read_inbox_max_id: newestReadMessageId,
      unread_count,
    });
  }

  scroll = new VirtualizedList({
    className: 'history__list',
    items: itemsSubject,
    pivotBottom: true,
    threshold: 3,
    batch: 20,
    focusFromBottom: true,
    renderer: (id: string) => message(id, service.activePeer.value!), // , (mid: string) => scroll.pendingRecalculate.push(mid)),
    selectGroup: (id: string) => messageGroupMap.get(id) || '0',
    renderGroup: historyDay,
    groupPadding: 34,
    onReachTop: () => service.loadMoreHistory(MessageDirection.Older),
    onReachBottom: () => service.loadMoreHistory(MessageDirection.Newer),
    onFocus: (id: string) => {
      updateDownButtonState(id);

      const numericId = messageCache.get(id)?.id;
      if (numericId !== undefined) {
        reportRead(numericId);
        updateUnreadCounter(numericId);
      }
    },
  });

  const downButton = button({
    className: showDownButton.pipe(
      distinctUntilChanged(),
      map((show) => `history__down ${show ? '' : '-hidden'}`),
    ),
    onClick: () => service.activePeer.value && service.selectPeer(service.activePeer.value, Infinity),
  }, icons.down());

  mount(scroll.container, downButton);

  const messageInputEl = messageInput();
  const headerEl = header();
  const historySection = scroll.container;

  useObservable(container, service.activePeer, (next) => {
    if (next) {
      if (welcome.parentElement) unmount(welcome);
      if (!headerEl.parentElement) mount(container, headerEl);
      if (!historySection.parentElement) mount(container, historySection);
      else scroll.clear();

      if (!messageInputEl.parentElement) mount(container, messageInputEl);

      if (next && next._ === 'peerChannel') {
        const chat = chatCache.get(next.channel_id);
        if (chat && chat._ === 'channel' && !chat.megagroup) {
          unmount(messageInputEl);
          return;
        }
      }

      if (!messageInputEl.parentElement) mount(container, messageInputEl);
    }
  });

  // Handle message focus
  useObservable(container, service.focusMessage, (focus) => {
    if (service.activePeer.value) {
      scroll.cfg.highlightFocused = focus.highlight || false;
      scroll.focus(
        peerMessageToId(service.activePeer.value, focus.id),
        {
          [MessageDirection.Newer]: -1,
          [MessageDirection.Older]: 1,
          [MessageDirection.Around]: undefined,
        }[focus.direction] as 1 | -1 | undefined,
      );
    }
  });

  // Makes the list stick to bottom when it shows the newest messages
  useObservable(container, service.history, ({ newestReached }) => {
    scroll.cfg.pivotBottom = newestReached ? true : undefined;
  });

  useObservable(container, service.history, (data) => itemsSubject.next(
    service.activePeer.value ? prepareIdsList(service.activePeer.value, data.ids) : [],
  ));

  useObservable(container, showSpinnerObservable, (show) => {
    if (show && !spinner) {
      mount(historySection, spinner = sectionSpinner({ className: 'history__spinner', useBackdrop: true }));
    } else if (!show && spinner) {
      unmount(spinner);
      spinner = undefined;
    }
  });

  return container;
}
