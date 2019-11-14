import { BehaviorSubject } from 'rxjs';
import { div, text } from 'core/html';
import './sandbox.scss';
import dialogs from './dialogs/dialogs';
import list from './list/list';
import scroll from './scroll/scroll';

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
  const dialogsAll = [];

  for (let i = 0; i < 1000; i += 1) {
    dialogsAll.push(`user${i}`);
    // dialogsAll.push(`chat${i}`);
    // dialogsAll.push(`channel${i}`);
  }
  const items = new BehaviorSubject(dialogsAll);
  // const items = new BehaviorSubject(['user123', 'chat3232', 'channel122312321']);

  // simulate update
  // setInterval(() => {
  //   const rnd = Math.floor(Math.random() * (items.value.length - 1));
  //   const b = items.value;
  //   b.splice(rnd, 1);

  //   items.next([items.value[rnd], ...b]);
  // }, 5000);

  // setInterval(() => {
  //   items.next(shuffle(items.value));
  // }, 2000);

  return div`.sandbox`(
    // dialogs(items),
    list({
      items,
      renderer: (item: string) => div`.test`(text(item)),
    }),
    scroll(
      ...items.value.map((item: string) => div`.test`(text(item))),
    ),
  );
}
