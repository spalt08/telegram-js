import { BehaviorSubject, combineLatest } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { button, div } from 'core/html';
import { listen, mount, unmount } from 'core/dom';
import { useObservable } from 'core/hooks';
import { message as service } from 'services';
import { Direction as MessageDirection } from 'services/message/types';
import message from 'components/message/message';
import { sectionSpinner, VirtualizedList } from 'components/ui';
import * as icons from 'components/icons';
import messageInput from 'components/message/input/input';
import { Peer, InputChannel } from 'cache/types';
import { peerMessageToId, peerToId } from 'helpers/api';
import { messageCache, dialogCache, chatCache } from 'cache';
import client from 'client/client';
import { peerToInputPeer } from 'cache/accessors';
import { todoAssertHasValue } from 'helpers/other';
import header from './header/header';

interface Props {
  className?: string;
}

function prepareIdsList(peer: Peer, messageIds: Readonly<number[]>): string[] {
  const { length } = messageIds;
  const reversed = new Array(length);
  for (let i = 0; i < length; i += 1) {
    reversed[length - i - 1] = peerMessageToId(peer, messageIds[i]);
  }
  return reversed;
}

export default function messages({ className = '' }: Props = {}) {
  const showDownButton = new BehaviorSubject(false);

  const downButton = button({
    className: showDownButton.pipe(
      distinctUntilChanged(),
      map((show) => `messages__down ${show ? '' : '-hidden'}`),
    ),
    style: {
      display: service.activePeer.pipe(map((peer) => peer ? '' : 'none')),
    },
  }, icons.down());
  const historySection = div`.messages__history`(downButton);
  const element = div`.messages ${className}`(
    header(),
    historySection,
    messageInput(),
  );
  let spinner: Node | undefined;

  const itemsSubject = new BehaviorSubject<string[]>([]);
  const showSpinnerObservable = combineLatest([service.history, service.loadingNextChunk])
    .pipe(map(([{ ids, loadingNewer, loadingOlder }, loadingNextChunk]) => (
      loadingNextChunk || ((loadingNewer || loadingOlder) && ids.length < 3)
    )));

  const scroll: VirtualizedList = new VirtualizedList({
    className: 'messages__list',
    items: itemsSubject,
    pivotBottom: true,
    threshold: 2,
    batch: 35,
    focusFromBottom: true,
    renderer: (id: string) => message(id, service.activePeer.value!, (mid: string) => scroll.pendingRecalculate.push(mid)),
    onReachTop: () => service.loadMoreHistory(MessageDirection.Older),
    onReachBottom: () => service.loadMoreHistory(MessageDirection.Newer),
    onFocus: (id: string) => {
      const showDown = !service.history.value.newestReached || itemsSubject.value[itemsSubject.value.length - 1] !== id;
      if (showDown !== showDownButton.value) {
        showDownButton.next(showDown);
      }

      const msg = messageCache.get(id);

      // send read status
      if (msg && msg._ !== 'messageEmpty' && service.activePeer.value) {
        const dialog = dialogCache.get(peerToId(service.activePeer.value));

        if (message && dialog?._ === 'dialog' && msg.id > dialog.read_inbox_max_id) {
          // read channel
          if (dialog.peer._ === 'peerChannel') {
            const channel = chatCache.get(dialog.peer.channel_id);
            if (!channel || channel._ !== 'channel') return;

            const inputChannel: InputChannel = {
              _: 'inputChannel',
              channel_id: dialog.peer.channel_id,
              access_hash: todoAssertHasValue(channel.access_hash),
            };
            client.call('channels.readHistory', { channel: inputChannel, max_id: msg.id }, () => {});
          // read other
          } else {
            client.call('messages.readHistory', { peer: peerToInputPeer(dialog.peer), max_id: msg.id });
          }

          let { unread_count } = dialog;

          if (msg.id === dialog.top_message) unread_count = 0;
          else {
            for (let i = scroll.current.indexOf(peerMessageToId(dialog.peer, dialog.read_inbox_max_id)) + 1; i <= scroll.current.indexOf(id); i++) {
              const next = messageCache.get(scroll.current[i]);
              if (next && next._ !== 'messageEmpty' && next.out === false) unread_count--;
            }
          }

          dialogCache.put({
            ...dialog, read_inbox_max_id: msg.id, unread_count,
          });
        }
      }
    },
  });

  mount(historySection, scroll.container);

  useObservable(element, service.activePeer, () => scroll.clear());

  // Handle message focus
  useObservable(element, service.focusMessage, (focus) => {
    if (service.activePeer.value) {
      scroll.cfg.highlightFocused = focus.highlight || false;
      scroll.focus(
        peerMessageToId(service.activePeer.value, focus.id),
        {
          [MessageDirection.Newer]: -1,
          [MessageDirection.Older]: 1,
          [MessageDirection.Around]: undefined,
        }[focus.direction],
      );
    }
  });

  // Makes the list stick to bottom when it shows the newest messages
  useObservable(element, service.history, ({ newestReached }) => {
    scroll.cfg.pivotBottom = newestReached ? true : undefined;
  });

  useObservable(element, service.history, (history) => itemsSubject.next(
    service.activePeer.value ? prepareIdsList(service.activePeer.value, history.ids) : [],
  ));

  useObservable(element, showSpinnerObservable, (show) => {
    if (show && !spinner) {
      mount(historySection, spinner = sectionSpinner({ className: 'messages__spinner', useBackdrop: true }));
    } else if (!show && spinner) {
      unmount(spinner);
      spinner = undefined;
    }
  });

  listen(downButton, 'click', () => service.activePeer.value && service.selectPeer(service.activePeer.value, Infinity));

  return element;
}
