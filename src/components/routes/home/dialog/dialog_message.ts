import { text, strong } from 'core/html';
import { messageCache, userCache } from 'cache';
import { peerMessageToId } from 'helpers/api';
import { Dialog } from 'mtproto-js';
import { typingIndicator } from 'components/ui';
import messageShort from 'components/message/short';

export default function dialogMessage(dialog: Dialog) {
  const msg = messageCache.get(peerMessageToId(dialog.peer, dialog.top_message));
  const user = msg && msg._ !== 'messageEmpty' && msg.from_id ? userCache.get(msg.from_id) : undefined;
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
