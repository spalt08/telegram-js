import { img, span, text } from 'core/html';
import { isEmojiSupported, getEmojiImageUrl, EmojiStyle } from 'helpers/emoji';
import { MaybeObservable, MaybeObservableMap, WritableStyles } from 'core/types';
import { useMaybeObservable } from 'core/hooks';
import { setProperty } from 'core/dom';
import './emoji.scss';

export interface Props {
  className?: string;
  style?: Partial<MaybeObservableMap<WritableStyles>>;
  variant?: EmojiStyle;
  polyfill?: boolean; // true - yes, false - no, undefined - auto
  lazy?: boolean;
}

// Polyfills an emoji when it's not supported by the OS.
// Resize it using the font-size CSS style.
//
// You might not need it because all the major platforms support emojies.
// It's designed for critical emojies (e.g. flags in the countries list on Windows).
export default function emoji(emojiStr: MaybeObservable<string>, {
  className = '',
  style,
  variant,
  polyfill = !isEmojiSupported,
  lazy = true,
}: Props = {}) {
  let content: Node;

  if (polyfill) {
    content = img({ loading: lazy ? 'lazy' : 'auto' });
    let lastEmojiStr: string | undefined;
    useMaybeObservable(content, emojiStr, true, (str) => {
      if (str !== lastEmojiStr) {
        lastEmojiStr = str;
        setProperty(content as HTMLImageElement, 'src', getEmojiImageUrl(str, variant));
        setProperty(content as HTMLImageElement, 'alt', str);
      }
    }, lazy); // src must be added on mount, otherwise loading="lazy" won't work
  } else {
    content = text(emojiStr);
  }

  return span`.emoji-polyfill ${className}`({ style }, content);
}
