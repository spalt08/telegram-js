import { escapeRegExp } from 'helpers/data';
import { fragment, mark, text } from 'core/html';
import { MaybeObservable } from 'core/types';
import { el, mount, unmountChildren } from 'core/dom';
import { useMaybeObservable } from 'core/hooks';

interface HighlighterOptions {
  /** The part of an input string after this length is ignored to improve the performance */
  inputMaxScanLength: number;
  outputMaxLength: number;
  /**
   * The input is trimmed from the start so that the highlight is at the start of the output.
   * This options set how far from the start the highlight can be in the output.
   */
  outputMaxStartOffset: number;
  /** A part of a regexp string to put between [] */
  wordSeparator?: string;
}

type Highlighter = (input: string, searchQuery: string) => Node;

interface HighlightComponentProps {
  text: MaybeObservable<string>;
  query: MaybeObservable<string>;
  tag: string;
  props?: Record<string, any>;
}

export const telegramSearchWordSeparator = '\\s.,!?\\-_+=\\\\/\\(\\)\\{\\}\\[\\]\'"`«»@';

/**
 * Calling the function creates a highlighter. Each highlighter has its own cache.
 */
export function makeTextMatchHighlighter({
  inputMaxScanLength,
  outputMaxLength,
  outputMaxStartOffset,
  wordSeparator = telegramSearchWordSeparator,
}: HighlighterOptions): Highlighter {
  const workSeparatorRegexp = new RegExp(`[${wordSeparator}]+`);
  let lastSearchQuery = '';
  let lastSearchQueryRegex: RegExp | undefined;

  return (input, searchQuery) => {
    // Caches the regular expression
    if (searchQuery !== lastSearchQuery) {
      lastSearchQuery = searchQuery;
      const regexString = searchQuery && searchQuery
        .split(workSeparatorRegexp)
        .reduce((words, word) => {
          if (!word) {
            return words;
          }
          return `${words}${words ? `[${wordSeparator}]+` : ''}${escapeRegExp(word)}[^${wordSeparator}]*`;
        }, '');
      lastSearchQueryRegex = regexString ? new RegExp(regexString, 'i') : undefined;
    }

    if (lastSearchQueryRegex) {
      const match = lastSearchQueryRegex.exec(
        input.length > inputMaxScanLength
          ? input.slice(0, inputMaxScanLength)
          : input,
      );

      if (match) {
        let start: number;

        if (match.index > outputMaxStartOffset) {
          start = match.index;
          const prefixToCheck = input.slice(start - outputMaxStartOffset, start);
          const prefixMatch = /(^|\s)\S+\s*$/.exec(prefixToCheck);
          if (prefixMatch) {
            start = start - prefixToCheck.length + prefixMatch.index + prefixMatch[1].length;
          }
        } else {
          start = 0;
        }

        return fragment(
          text(`${start === 0 ? '' : '...'}${input.slice(start, match.index)}`),
          mark(text(match[0])),
          text(input.slice(match.index + match[0].length, start + outputMaxLength)),
        );
      }
    }

    return text(input.slice(0, outputMaxLength));
  };
}

/**
 * Calling the function creates a component. Each component has its own cache.
 * An element of the component watches text and search query changes and self-updates.
 */
export function makeTextMatchHighlightComponent(options: HighlighterOptions) {
  const highlighter = makeTextMatchHighlighter(options);

  return function textMatchHighlightComponent({ text: content, query, tag, props }: HighlightComponentProps) {
    const element = el(tag, props);
    let lastContent: string | undefined;
    let lastQuery: string | undefined;

    function updateContent() {
      if (lastContent !== undefined && lastQuery !== undefined) {
        unmountChildren(element);
        mount(element, highlighter(lastContent, lastQuery));
      }
    }

    useMaybeObservable(element, content, (newContent) => {
      if (newContent !== lastContent) {
        lastContent = newContent;
        updateContent();
      }
    });

    useMaybeObservable(element, query, (newQuery) => {
      if (newQuery !== lastQuery) {
        lastQuery = newQuery;
        updateContent();
      }
    });

    return element;
  };
}
