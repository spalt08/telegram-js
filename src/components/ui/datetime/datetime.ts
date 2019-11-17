import { span, text } from 'core/html';
import { useMaybeObservable } from 'core/hooks';
import { MaybeObservable } from 'core/types';

type Props = {
  timestamp: MaybeObservable<number>,
  className?: string,
  date?: boolean,
};

const SIX_DAYS = 6 * 24 * 3600 * 1000;

function format(date: Date, showdate: boolean = true): string {
  const today = new Date();

  if (date.toDateString() === today.toDateString() || !showdate) {
    return `${date.getHours()}:${`0${date.getMinutes()}`.slice(-2)}`;
  }

  if (today.getTime() - date.getTime() < SIX_DAYS) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  return date.toLocaleDateString();
}

export default function datetime({ timestamp, className, date = true }: Props) {
  const node = text('');
  const element = span({ className }, node);

  useMaybeObservable(element, timestamp, (ts) => {
    const tdate = new Date(ts * 1000);
    node.textContent = format(tdate, date);
  });

  return element;
}
