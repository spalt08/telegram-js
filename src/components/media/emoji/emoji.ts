import { text, span } from 'core/html';
import { listen } from 'core/dom';

/**
 * Emoji renderer with image polyfill
 * @param single Used to force single image load without spritesheet
 */
// TO DO: add polyfill :))
export default function emoji(code: string, onClick?: (emoji: string) => void) {
  const el = span(text(code));

  if (onClick) listen(el, 'click', () => onClick(code));

  return el;
}
