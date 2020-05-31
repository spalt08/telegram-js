import codePoints from 'code-points';

// Windows doesn't have all the emojies (e.g. flags)
export const isEmojiSupported = /OS X|iPhone|iPad|iOS|Android/i.test(navigator.userAgent);

export type EmojiStyle = 'apple' | 'facebook' | 'messenger' | 'twitter' | 'google';

export function getEmojiImageUrl(emoji: string, style: EmojiStyle = 'apple'): string {
  const emojiCode = codePoints(emoji)
    .map((codePoint) => {
      let code = codePoint.toString(16);
      while (code.length < 4) {
        code = `0${code}`;
      }
      return code;
    })
    .join('-');
  return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@4.1.0/img/${style}/64/${emojiCode}.png`;
}

export function getSurrogatePairAtIndex(str: string, index: number): string | undefined {
  // surrogate pair (U+D800 to U+DFFF)
  if ((str.charCodeAt(index) & 0xf800) === 0xd800) {
    return str.slice(index, 2);
  }

  return undefined;
}
