
import { Message } from 'mtproto-js';
import { div, text } from 'core/html';
import './gallery_footer.scss';
import { useInterface } from 'core/hooks';

export function galleryFooter(message: Message.message) {
  const messageNode = text(message.message || '');
  const container = div`.galleryFooter`(
    div`.galleryFooter__message`(messageNode),
  );

  return useInterface(container, {
    update(next: Message.message) {
      console.log('update', next.message);
      messageNode.textContent = next.message || '';
    },
  });
}
