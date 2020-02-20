import { datetime } from 'components/ui';
import { Message } from 'cache/types';
import { div } from 'core/html';

export default function messageDate(message: Message.message) {
  return div`.message__date`(datetime({ timestamp: message.date, date: false }));
}
