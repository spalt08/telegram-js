import { BehaviorSubject } from 'rxjs';
import { div, text } from 'core/html';
import list from './list/list';
import './sandbox.scss';

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
  const items = new BehaviorSubject([1, 2, 3, 4, 5, 6]);

  setInterval(() => {
    items.next(shuffle(items.value));
  }, 3000);

  window.i = items;

  const renderer = (v: number) => div`.test`(text(v.toString()));

  return div`.sandbox`(
    list({
      className: 'example',
      items,
      renderer,
    }),
  );
}
