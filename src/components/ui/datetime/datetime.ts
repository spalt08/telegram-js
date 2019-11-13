import { span, text } from 'core/html';
import { useOnUnmount } from 'core/hooks';

type Props = {
  timestamp: number,
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
  if (timestamp === 0) return span();

  const date = new Date(timestamp * 1000);
  const node = text(format(date));

  let timer: ReturnType<typeof setTimeout>;

  const update = () => {
    node.textContent = format(date);
    timer = setTimeout(update, 1000 * 60);
  };

  timer = setTimeout(update, 1000 * (60 - (new Date()).getSeconds()));

  const element = span({ className }, node);

  useOnUnmount(element, () => clearTimeout(timer));

  return element;
}
