import { div, text } from 'core/html';
import { datetime, ripple } from 'components/ui';
import { messageCache } from 'cache';
import { MessageCommon } from 'cache/types';
import { messageToDialogPeer, userIdToPeer } from 'helpers/api';
import { profileAvatar, profileTitle } from 'components/profile';
import './found_message.scss';

function highlightMatch(message: MessageCommon, _searchQuery?: string): Node {
  // todo: Implement (warp the matches with `mark`)
  return text(message.message);
}

export default function foundMessage(messageUniqueId: string, searchQuery?: string) {
  const message = messageCache.get(messageUniqueId);
  // Message is not updated intentionally

  if (!message) {
    return div`.foundMessage__empty`(
      text('(the message has been deleted)'),
    );
  }

  if (message._ === 'messageEmpty') {
    return div`.foundMessage__empty`(
      text('(empty message)'),
    );
  }

  const dialogPeer = messageToDialogPeer(message);
  const fromPeer = userIdToPeer(message.from_id);

  return div`.foundMessage`(
    ripple({
      className: 'foundMessage__ripple',
      contentClass: 'foundMessage__ripple_content',
      onClick() {
        // todo: Implement
        console.log('Go to message', { peer: dialogPeer, id: message.id });
      },
    }, [
      profileAvatar(fromPeer, message),
      div`.foundMessage__main`(
        div`.foundMessage__header`(
          div`.foundMessage__name`(
            profileTitle(fromPeer),
          ),
          datetime({ timestamp: message.date, className: 'foundMessage__time' }),
        ),
        div`.foundMessage__message`(
          message._ === 'message'
            ? highlightMatch(message, searchQuery)
            : text('(service message)'),
        ),
      ),
    ]),
  );
}
