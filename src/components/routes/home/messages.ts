import { BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { div } from 'core/html';
import { mount, unmount } from 'core/dom';
import { useObservable } from 'core/hooks';
import { message as service } from 'services';
import message from 'components/message/message';
import { list, sectionSpinner } from 'components/ui';
import messageInput from 'components/message/input/message_input';
import header from './header/header';

function reverseIdsList<T>(ids: Readonly<T[]>): T[] {
  const { length } = ids;
  const reversed = new Array(length);
  for (let i = 0; i < length; i += 1) {
    reversed[length - i - 1] = ids[i];
  }
  return reversed;
}

export default function messages() {
  const element = div`.messages`(
    header(),
    messageInput(),
  );
  let spinner: Node | undefined;

  const itemsSubject = new BehaviorSubject<number[]>([]);
  const showSpinnerObservable = combineLatest([service.history, service.isLoading]).pipe(
    map(([messagesList, isLoading]) => messagesList.length === 0 && isLoading),
  );

  mount(element, list({
    className: 'messages__history',
    items: itemsSubject,
    reversed: true,
    threshold: 800,
    batch: 20,
    renderer: (id: number) => message(id, service.activePeer.value!),
    onReachEnd: () => service.loadMoreHistory(),
  }), element.lastElementChild!);

  // Make the list scroll to bottom on an active peer change
  useObservable(element, service.activePeer, () => itemsSubject.next([]));

  useObservable(element, service.history, (history) => itemsSubject.next(reverseIdsList(history)));

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
