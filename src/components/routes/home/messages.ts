import { BehaviorSubject } from 'rxjs';
import { div } from 'core/html';
import { mount } from 'core/dom';
import { useObservable } from 'core/hooks';
import { message as service } from 'services';
import message from 'components/message/message';
import { list } from 'components/ui';
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
  // todo: Add loading placeholder
  const element = div`.messages`(
    header(),
  );
  const itemsSubject = new BehaviorSubject<number[]>([]);

  useObservable(element, service.activePeer, () => itemsSubject.next([]));
  useObservable(element, service.history, (history) => itemsSubject.next(reverseIdsList(history)));

  mount(element, list({
    className: 'messages__history',
    items: itemsSubject,
    reversed: true,
    threshold: 800,
    batch: 30,
    renderer: (id: number) => message(id, service.activePeer.value!),
    onReachEnd: () => service.loadMoreHistory(),
  }));

  const input = messageInput();

  mount(element, input);

  return element;
}
