import { Message } from 'client/schema';
import { div, text } from 'core/html';
import { datetime } from 'components/ui';
import { formatNumber } from 'helpers/other';

import './message_info.scss';

export type ReadStatus =
  | 'sending'
  | 'unread'
  | 'read'
  | 'error';

export default function messageInfo(message: Message.message, status: ReadStatus) {
  const children: Node[] = [];
  if (message.views && !message.out) {
    children.push(div`.messageInfo_views`(text(`${formatNumber(message.views)}`), div`.messageInfo__eye`()));
  }
  if (message.post_author && !message.out) {
    children.push(div`.messageInfo_author`(text(message.post_author)));
    children.push(text(', '));
  }
  if (message.edit_date && !message.edit_hide) {
    children.push(text('edited '));
  }
  children.push(datetime({ timestamp: message.date, date: false }));
  if (message.out) {
    children.push(div`.messageInfo__status`());
  }
  const element = div`.messageInfo`(...children);

  if (message.edit_date && !message.edit_hide) {
    element.title = `${new Date(message.date * 1000).toLocaleString()}\nEdited: ${new Date(message.edit_date * 1000).toLocaleString()}`;
  } else {
    element.title = new Date(message.date * 1000).toLocaleString();
  }

  element.classList.toggle('-no-message', !message.message);
  element.classList.toggle('-out', message.out);
  if (message.out) {
    element.classList.add(`-${status}`);
  }

  return element;
}
