
import { Message } from 'mtproto-js';
import { div, text } from 'core/html';
import './gallery_footer.scss';

export function galleryFooter(message: Message.message) {
  const messageNode = text(message.message || '');
  const container = div`.galleryFooter`(
    div`.galleryFooter__message`(messageNode),
  );

  return container;
}
