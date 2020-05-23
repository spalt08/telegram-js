import { div, text, span } from 'core/html';
import './history_day.scss';

export default function historyDay(day: string) {
  const date = new Date(+day * 1000 * 3600 * 24);

  return div`.historyDay`(
    div`.historyDay__label`(span(text(date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })))),
  );
}
