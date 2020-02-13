import { datetime } from 'components/ui';
import { MessageCommon } from 'cache/types';
import { div } from 'core/html';

export default function messageDate(message: MessageCommon) {
  return div`.message__date`(datetime({ timestamp: message.date, date: false }));
}
