import { BehaviorSubject } from 'rxjs';
import { div } from 'core/html';
import './sandbox.scss';
import dialogs from './dialogs/dialogs';

/**
 * Shuffles array in place.
 */
function shuffle(a: any[]): any[] {
  const b = a;

  let j; let x; let i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = b[i];
    b[i] = a[j]; // eslint-disable-line
    b[j] = x; // eslint-disable-line
  }
  return a;
}

export default function sandbox() {
  const extra = ['132123124', 'dsfsdf', '1412412', '3413514'];
  const items = new BehaviorSubject(['user123', 'chat3232', 'channel122312321', 'user94473', 'user32112421', 'channel5123123']);
  // const items = new BehaviorSubject(['user123', 'chat3232', 'channel122312321']);

  // simulate update
  // setInterval(() => {
  //   const rnd = Math.floor(Math.random() * (items.value.length - 1));
  //   const b = items.value;
  //   b.splice(rnd, 1);

  //   items.next([items.value[rnd], ...b]);
  // }, 5000);
  let i = 0;

  setInterval(() => {
    if (i % 2 === 1) items.next(shuffle(items.value.slice(1)));
    else if (i % 2 === 0 && extra.length > 0) items.next([extra.pop(), ...items.value])
    else items.next(shuffle(items.value));
    i += 1;
  }, 2000);

  return div`.sandbox`(
    dialogs(items),
  );
}
