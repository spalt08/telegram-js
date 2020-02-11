import { div, text } from 'core/html';
import { datetime, highlightSearchMatch, ripple } from 'components/ui';
import { messageCache } from 'cache';
import { messageToDialogPeer, userIdToPeer } from 'helpers/api';
import { profileAvatar, profileTitle } from 'components/profile';
import { MaybeObservable } from 'core/types';
import { mount, unmount } from 'core/dom';
import { useMaybeObservable } from 'core/hooks';
import './found_message.scss';

export default function foundMessage(messageUniqueId: string, searchQuery: MaybeObservable<string> = '') {
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

  const messageEl = div`.foundMessage__message`();
  if (message._ === 'message') {
    let lastSearchQuery: string | undefined;
    useMaybeObservable(messageEl, searchQuery, (query) => {
      if (query !== lastSearchQuery) {
        lastSearchQuery = query;
        while (messageEl.firstChild) {
          unmount(messageEl.firstChild);
        }
        mount(messageEl, highlightSearchMatch(message.message, query));
      }
    });
  } else {
    messageEl.textContent = '(service message)';
  }

  return div`.foundMessage`(
    ripple({
      className: 'foundMessage__ripple',
      contentClass: 'foundMessage__ripple_content',
      onClick() {
        // todo: Implement jumping to message
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
        messageEl,
      ),
    ]),
  );
}
