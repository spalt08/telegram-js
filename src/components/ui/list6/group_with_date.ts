import { div, text } from 'core/html';
import listGroup from './list_group';

import './group_with_date.scss';

export default function groupWithDate(date: number) {
  return listGroup<number>((container) => (
    div`.groupWithDate`(
      div`.groupWithDate__date`(text(new Date(date).toDateString())),
      container,
    )
  ));
}
