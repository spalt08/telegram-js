import { text } from 'core/html';

/**
 * Emoji renderer with image polyfill
 * @param single Used to force single image load without spritesheet
 */
// TO DO: add polyfill :))
export default function emoji(code: string) {
  return text(code);
}
