import binarySearch from 'binary-search';
import { Peer } from 'mtproto-js';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { button, div, text } from 'core/html';
import { mount, unmount, animationFrameStart } from 'core/dom';
import { useObservable } from 'core/hooks';
import { message as service, dialog as dialogService } from 'services';
import { Direction as MessageDirection } from 'services/message/types';
import message, { MessageSibling } from 'components/message/message';
import { sectionSpinner, VirtualizedList } from 'components/ui';
import * as icons from 'components/icons';
import messageInput from 'components/message/input/input';
import { compareSamePeerMessageIds, peerMessageToId, peerToId } from 'helpers/api';
import { getDayOffset } from 'helpers/message';
import { isiOS } from 'helpers/browser';
import { messageCache, dialogCache, chatCache } from 'cache';
import header from './header/header';
import historyDay from './history_day/history_day';
import './history.scss';

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
    initialPaddingBottom: 10,
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

  const messageInputEl = messageInput();
  const headerEl = header({ onBackToContacts });
  const historySection = div`.history__content`(scroll.container);

  mount(historySection, downButton);

  useObservable(container, showSpinnerObservable, (show) => {
    if (show && !spinner) {
      mount(historySection, spinner = sectionSpinner({ className: 'history__spinner', useBackdrop: true }));
    } else if (!show && spinner) {
      animationFrameStart().then(() => {
        if (spinner) unmount(spinner);
        spinner = undefined;
      });
    }
  });

  useObservable(container, service.activePeer, (next) => {
    if (next) {
      messageDayMap.clear();
      messageSiblingsMap.clear();
      lastUnreadMessage = undefined;

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

  useObservable(container, service.history, (data) => {
    scroll.cfg.topReached = data.oldestReached;
    itemsSubject.next(service.activePeer.value ? prepareIdsList(service.activePeer.value, data.ids) : []);
  });

  return container;
}
