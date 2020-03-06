import { text, strong } from 'core/html';
import { messageCache, userCache } from 'cache';
import { peerMessageToId } from 'helpers/api';
import { Dialog } from 'client/schema';
import { typingIndicator } from 'components/ui';
import messageShort from 'components/message/short';
import { todoAssertHasValue } from 'helpers/other';

export default function dialogMessage(dialog: Dialog) {
  const msg = messageCache.get(peerMessageToId(dialog.peer, dialog.top_message));
  const user = msg && msg._ !== 'messageEmpty' ? userCache.get(todoAssertHasValue(msg.from_id)) : undefined;
  const userLabel = user?._ === 'user' ? user.first_name : '';
  const content = msg ? messageShort(msg) : '';

  if (dialog.peer._ !== 'peerUser' && userLabel) {
    return (
      typingIndicator(
        dialog.peer,
        '',
        strong`.dialog__message_title`(text(`${userLabel}: `)),
        text(content),
      )
    );
  }

  return typingIndicator(dialog.peer, '', text(content));
}
