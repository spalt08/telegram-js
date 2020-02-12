import { escapeRegExp } from 'helpers/data';
import { fragment, mark, text } from 'core/html';

const HIGHLIGHT_MAX_INPUT_LENGTH = 1000;
const HIGHLIGHT_MAX_OUTPUT_LENGTH = 100;
const HIGHLIGHT_MAX_START_OFFSET = 10;
const SEPARATOR_REGEX = '\\s.,!?\\-_+=\\\\/\\(\\)\\{\\}\\[\\]\'"`«»';

let lastSearchQuery = '';
let lastSearchQueryRegex: RegExp | undefined;

export default function highlightSearchMatch(message: string, searchQuery: string): Node {
  // Memoizes the regular expression
  if (searchQuery !== lastSearchQuery) {
    lastSearchQuery = searchQuery;
    const regexString = searchQuery
      .split(new RegExp(`[${SEPARATOR_REGEX}]+`))
      .reduce((words, word) => {
        if (!word) {
          return words;
        }
        return `${words}${words ? `[${SEPARATOR_REGEX}]+` : ''}${escapeRegExp(word)}[^${SEPARATOR_REGEX}]*`;
      }, '');
    lastSearchQueryRegex = regexString ? new RegExp(regexString, 'i') : undefined;
  }

  if (lastSearchQueryRegex) {
    const match = lastSearchQueryRegex.exec(
      message.length > HIGHLIGHT_MAX_INPUT_LENGTH
        ? message.slice(0, HIGHLIGHT_MAX_INPUT_LENGTH)
        : message,
    );
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
        text(message.slice(match.index + match[0].length, start + HIGHLIGHT_MAX_OUTPUT_LENGTH)),
      );
    }
  }

  return text(message.slice(0, HIGHLIGHT_MAX_OUTPUT_LENGTH));
}
