import { BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { div } from 'core/html';
import { mount, unmount } from 'core/dom';
import { useObservable, getInterface } from 'core/hooks';
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

  const scroll = list({
    className: 'messages__history',
    items: itemsSubject,
    pivotBottom: true,
    threshold: 2,
    batch: 35,
    renderer: (id: string) => message(id, service.activePeer.value!),
    onReachTop: () => service.loadMoreHistory(),
  });

  mount(element, scroll, element.lastElementChild!);

  // Make the list scroll to bottom on an active peer change
  useObservable(element, service.activePeer, () => getInterface(scroll).clear());
  useObservable(element, service.focused, (id: string) => id && getInterface(scroll).focus(id));

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
