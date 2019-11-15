import { span, text } from 'core/html';
import { useMaybeObservable, useOnMount, useOnUnmount } from 'core/hooks';
import { MaybeObservable } from 'core/types';

type Props = {
  timestamp: MaybeObservable<number>,
  className?: string,
};

const SIX_DAYS = 6 * 24 * 3600 * 1000;

function format(date: Date): string {
  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return `${date.getHours()}:${`0${date.getMinutes()}`.slice(-2)}`;
  }

  if (today.getTime() - date.getTime() < SIX_DAYS) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  return date.toLocaleDateString();
}

export default function datetime({ timestamp, className }: Props) {
  const node = text('');
  const element = span({ className }, node);
  let lastTimestamp = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function stop() {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  function start() {
    stop();

    if (lastTimestamp === 0) {
      node.textContent = '';
      return;
    }

    const date = new Date(lastTimestamp * 1000);
    node.textContent = format(date);

    function print() {
      node.textContent = format(date);
    }

    function update() {
      print();
      timer = setTimeout(update, 1000 * 60);
    }

    print();
    timer = setTimeout(update, 1000 * (60 - (new Date()).getSeconds()));
  }

  useMaybeObservable(element, timestamp, (ts) => {
    lastTimestamp = ts;
    start();
  });

  useOnMount(element, start);
  useOnUnmount(element, stop);

  return element;
}
