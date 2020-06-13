import { text } from 'core/html';
import { useMaybeObservable } from 'core/hooks';
import { MaybeObservable } from 'core/types';

type Props = {
  timestamp: MaybeObservable<number>,
  date?: boolean,
  full?: boolean,
};

const SIX_DAYS = 6 * 24 * 3600 * 1000;

function format(date: Date, showdate: boolean = true, showfull: boolean = false): string {
  const today = new Date();
  const time = `${date.getHours()}:${`0${date.getMinutes()}`.slice(-2)}`;

  if (date.toDateString() === today.toDateString() || !showdate) {
    if (showfull) return `Today at ${time}`;
    return time;
  }

  if (today.getTime() - date.getTime() < SIX_DAYS) {
    if (showfull) return date.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', minute: '2-digit', hour: '2-digit' });
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  if (showfull) return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', minute: '2-digit', hour: '2-digit' });
  return date.toLocaleDateString();
}

export default function datetime({ timestamp, date = true, full = false }: Props) {
  let lastText = '';
  const node = text(lastText);

  useMaybeObservable(node, timestamp, true, (ts) => {
    const newText = format(new Date(ts * 1000), date, full);
    if (newText !== lastText) {
      lastText = newText;
      node.textContent = newText;
    }
  });

  return node;
}
