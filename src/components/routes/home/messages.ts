import { div } from 'core/html';
import { message as service } from 'services';
import message from 'components/message/message';
import { list } from 'components/ui';
import { BehaviorSubject } from 'rxjs';
import { mount } from '../../../core/dom';
import { useObservable } from '../../../core/hooks';

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

  const element = div`.messages`();
  const itemsSubject = new BehaviorSubject<number[]>([]);

  useObservable(element, service.history, (history) => itemsSubject.next(reverseIdsList(history)));

  mount(element, list({
    className: 'messages__history',
    items: itemsSubject,
    threshold: 1000,
    batch: 100,
    renderer: (id: number) => message(id, service.activePeer.value!),
  }));

  return element;
}
