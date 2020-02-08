import { span, text } from 'core/html';
import { useMaybeObservable } from 'core/hooks';
import { MaybeObservable } from 'core/types';

type Props = {
  timestamp: MaybeObservable<number>,
  className?: string,
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

export default function datetime({ timestamp, className, date = true, full = false }: Props) {
  const node = text('');
  const element = span({ className }, node);

  useMaybeObservable(element, timestamp, (ts) => {
    const tdate = new Date(ts * 1000);
    node.textContent = format(tdate, date, full);
  });

  return element;
}
