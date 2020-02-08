import { BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { div } from 'core/html';
import { mount, unmount } from 'core/dom';
import { useObservable } from 'core/hooks';
import { message as service } from 'services';
import message from 'components/message/message';
import { list, sectionSpinner } from 'components/ui';
import messageInput from 'components/message/input/message_input';
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
  const showSpinnerObservable = combineLatest([service.history, service.loadingSides])
    .pipe(map(([messagesList, loadingDirections]) => messagesList.length < 3 && loadingDirections.length));

  mount(element, list({
    className: 'messages__history',
    items: itemsSubject,
    reversed: true,
    threshold: 800,
    batch: 20,
    renderer: (id: string) => message(id, service.activePeer.value!),
    onReachEnd: () => service.loadMoreHistory(),
  }), element.lastElementChild!);

  // Make the list scroll to bottom on an active peer change
  useObservable(element, service.activePeer, () => itemsSubject.next([]));

  useObservable(element, service.history, (history) => itemsSubject.next(
    service.activePeer.value ? prepareIdsList(service.activePeer.value, history) : [],
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
