import { div, fragment, mark, text } from 'core/html';
import { datetime, ripple } from 'components/ui';
import { messageCache } from 'cache';
import { MessageCommon } from 'cache/types';
import { messageToDialogPeer, userIdToPeer } from 'helpers/api';
import { escapeRegExp } from 'helpers/data';
import { profileAvatar, profileTitle } from 'components/profile';
import './found_message.scss';

const HIGHLIGHT_MAX_LENGTH = 100;
const HIGHLIGHT_MAX_START_OFFSET = 10;

let lastSearchQuery = '';
let lastSearchQueryRegex: RegExp | undefined;

function highlightMatch({ message }: MessageCommon, searchQuery: string = ''): Node {
  // Memoizes the regular expression
  if (searchQuery !== lastSearchQuery) {
    lastSearchQuery = searchQuery;
    const regexString = searchQuery.split(/\s+/).reduce((words, word) => {
      if (!word) {
        return words;
      }
      return `${words}${words ? '\\s+' : ''}${escapeRegExp(word)}\\S*`;
    }, '');
    lastSearchQueryRegex = regexString ? new RegExp(regexString, 'i') : undefined;
  }

  if (lastSearchQueryRegex) {
    const match = lastSearchQueryRegex.exec(message);
    if (match) {
      let start = match.index;
      const prefixToCheck = message.slice(Math.max(0, start - HIGHLIGHT_MAX_START_OFFSET), start);
      const prefixMatch = /(^|\s)\S+\s*$/.exec(prefixToCheck);
      if (prefixMatch) {
        start = start - prefixToCheck.length + prefixMatch.index + prefixMatch[1].length;
      }
      return fragment(
        text(`${start === 0 ? '' : '...'}${message.slice(start, match.index)}`),
        mark(text(match[0])),
        text(message.slice(match.index + match[0].length, start + HIGHLIGHT_MAX_LENGTH)),
      );
    }
  }

  return text(message.slice(0, HIGHLIGHT_MAX_LENGTH));
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
        div`.foundMessage__message`(
          message._ === 'message'
            ? highlightMatch(message, searchQuery)
            : text('(service message)'),
        ),
      ),
    ]),
  );
}
