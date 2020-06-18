import binarySearch from 'binary-search';
import { dialogCache, messageCache } from 'cache';
import * as icons from 'components/icons';
import messageInput from 'components/message/input/input';
import message, { MessageSibling } from 'components/message/message';
import { keyboardInput, sectionSpinner, VirtualizedList } from 'components/ui';
import { animationFrameStart, mount, unmount } from 'core/dom';
import { getInterface, useObservable } from 'core/hooks';
import { button, div, text } from 'core/html';
import { compareSamePeerMessageIds, peerMessageToId, peerToId } from 'helpers/api';
import { isiOS } from 'helpers/browser';
import { getDayOffset } from 'helpers/message';
import { Peer } from 'mtproto-js';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { dialog as dialogService, message as service } from 'services';
import { Direction as MessageDirection } from 'services/message/types';
import header from './header/header';
import './history.scss';
import historyDay from './history_day/history_day';

type Props = {
  onBackToContacts: () => void,
};

/**
 * Message Helpers
 */
const messageDayMap = new Map<string, string>();
const messageSiblingsMap = new Map<string, BehaviorSubject<[MessageSibling, MessageSibling]>>();
let lastUnreadMessage: string | undefined;

function prepareIdsList(peer: Peer, messageIds: Readonly<number[]>): string[] {
  const { length } = messageIds;
  const reversed = new Array(length);
  const dialog = dialogCache.get(peerToId(peer));

  let prevSibling: MessageSibling;
  let unreadMessageToBeMarked: string | undefined;

  for (let i = 0; i < length; i += 1) {
    const id = peerMessageToId(peer, messageIds[i]);
    const msg = messageCache.get(id);

    if (msg && msg._ !== 'messageEmpty') {
      reversed[length - i - 1] = id;

      if (dialog && dialog._ === 'dialog' && !lastUnreadMessage) {
        if (msg._ === 'message' && !msg.out && msg.id > dialog.read_inbox_max_id) {
          unreadMessageToBeMarked = id;
        }
      }

      const item = {
        id,
        day: getDayOffset(msg),
        from: msg.from_id,
      };

      const siblings = messageSiblingsMap.get(id) || new BehaviorSubject([prevSibling, undefined]);
      if ((siblings.value[0] ? siblings.value[0].id : undefined) !== (prevSibling ? prevSibling.id : undefined)) {
        siblings.next([prevSibling, siblings.value[1]]);
      }

      messageSiblingsMap.set(id, siblings);
      messageDayMap.set(id, getDayOffset(msg));

      if (prevSibling) {
        const prevSiblings = messageSiblingsMap.get(prevSibling.id);
        if (prevSiblings && (prevSiblings.value[1] ? prevSiblings.value[1].id : undefined) !== item.id) {
          prevSiblings.next([prevSiblings.value[0], item]);
        }
      }

      prevSibling = item;
    }
  }

  if (unreadMessageToBeMarked) lastUnreadMessage = unreadMessageToBeMarked;

  return reversed;
}

export default function history({ onBackToContacts }: Props) {
  const welcome = div`.history__welcome`(div`.history__welcome-text`(text('Select a chat to start messaging')));

  const container = div`.history`(welcome);
  const showDownButton = new BehaviorSubject(false);

  let spinner: Node | undefined;
  let scroll: VirtualizedList;

  const itemsSubject = new BehaviorSubject<string[]>([]);
  const peerSubject = new BehaviorSubject<Peer | null>(null);
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
    threshold: 2,
    batch: 20, // navigator.userAgent.indexOf('Safari') > -1 ? 5 : 20,
    initialPaddingBottom: 0,
    forcePadding: isiOS ? 100000 : 0,
    renderer: (id: string) => message(id, messageSiblingsMap.get(id)!, id === lastUnreadMessage),
    selectGroup: (id: string) => messageDayMap.get(id) || '0',
    renderGroup: historyDay,
    groupPadding: 34,
    onReachTop: () => service.loadMoreHistory(MessageDirection.Older),
    onReachBottom: () => service.loadMoreHistory(MessageDirection.Newer),
    onTrace: (_top?: string, bottom?: string) => {
      if (!bottom) return;

      updateDownButtonState(bottom);

      const numericId = messageCache.get(bottom)?.id;
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

  const historySection = div`.history__content`(scroll.container);

  mount(historySection, downButton);

  useObservable(container, showSpinnerObservable, true, (show) => {
    if (show && !spinner) {
      mount(historySection, spinner = sectionSpinner({ className: 'history__spinner', useBackdrop: true }));
    } else if (!show && spinner) {
      animationFrameStart().then(() => {
        if (spinner) unmount(spinner);
        spinner = undefined;
      });
    }
  });

  const messageInputEl = messageInput(peerSubject);
  const keyboardInputEl = keyboardInput(peerSubject, () => getInterface(messageInputEl).updateVisibility());
  const headerEl = header({ onBackToContacts });

  mount(container, historySection);
  mount(container, messageInputEl);
  mount(container, keyboardInputEl);

  useObservable(container, service.activePeer, true, (next) => {
    peerSubject.next(next);
    if (next) {
      messageDayMap.clear();
      messageSiblingsMap.clear();
      getInterface(messageInputEl).updateVisibility();
      lastUnreadMessage = undefined;

      if (!headerEl.parentElement) mount(container, headerEl, historySection);
      if (welcome.parentElement) unmount(welcome);
      scroll.clear();
    }
  });

  // Handle message focus
  useObservable(container, service.focusMessage, false, (focus) => {
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
  useObservable(container, service.history, true, ({ newestReached, oldestReached, ids }) => {
    scroll.cfg.pivotBottom = newestReached ? true : undefined;
    scroll.cfg.topReached = oldestReached;

    const nextIds = service.activePeer.value ? prepareIdsList(service.activePeer.value, ids) : [];
    if (lastUnreadMessage && scroll.items.length === 0) scroll.shouldFocus = lastUnreadMessage;

    itemsSubject.next(nextIds);
  });

  return container;
}
