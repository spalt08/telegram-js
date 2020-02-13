import { BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { div } from 'core/html';
import { mount, unmount } from 'core/dom';
import { useObservable } from 'core/hooks';
import { message as service } from 'services';
import { Direction as MessageDirection } from 'services/message/types';
import message from 'components/message2/message';
import { sectionSpinner, VirtualizedList } from 'components/ui';
import messageInput from 'components/message/input/input';
import { Peer } from 'cache/types';
import { peerMessageToId } from 'helpers/api';
import header from './header/header';

function prepareIdsList(peer: Peer, messageIds: Readonly<number[]>): string[] {
  const { length } = messageIds;
  const reversed = new Array(length);
  for (let i = 0; i < length; i += 1) {
    reversed[length - i - 1] = peerMessageToId(peer, messageIds[i]);
  }
  return reversed;
}

export default function messages() {
  const element = div`.messages`(
    header(),
    messageInput(),
  );
  let spinner: Node | undefined;

  const itemsSubject = new BehaviorSubject<string[]>([]);
  const showSpinnerObservable = combineLatest([service.history, service.loadingNextChunk])
    .pipe(map(([{ ids, loadingNewer, loadingOlder }, loadingNextChunk]) => (
      loadingNextChunk || ((loadingNewer || loadingOlder) && ids.length < 3)
    )));

  const scroll: VirtualizedList = new VirtualizedList({
    className: 'messages__history',
    items: itemsSubject,
    pivotBottom: true,
    threshold: 2,
    batch: 35,
    renderer: (id: string) => message(id, service.activePeer.value!, (mid: string) => scroll.pendingRecalculate.push(mid)),
    onReachTop: () => service.loadMoreHistory(MessageDirection.Older),
    onReachBottom: () => service.loadMoreHistory(MessageDirection.Newer),
  });

  mount(element, scroll.container, element.lastElementChild!);

  useObservable(element, service.activePeer, () => scroll.clear());

  // Handle message focus
  useObservable(element, service.focusMessage, (focus) => {
    if (focus && service.activePeer.value) {
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
    scroll.cfg.pivotBottom = !!newestReached;
  });

  useObservable(element, service.history, (history) => itemsSubject.next(
    service.activePeer.value ? prepareIdsList(service.activePeer.value, history.ids) : [],
  ));

  useObservable(element, showSpinnerObservable, (show) => {
    if (show && !spinner) {
      mount(element, spinner = sectionSpinner({ className: 'messages__spinner' }));
    } else if (!show && spinner) {
      unmount(spinner);
      spinner = undefined;
    }
  });

  return element;
}
