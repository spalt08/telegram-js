import { Message } from 'mtproto-js';
import { quote } from 'components/ui';
import { messageToSenderPeer } from 'cache/accessors';
import { profileTitle } from 'components/profile';
import { div } from 'core/html';
import photoRenderer from 'components/media/photo/photo';
import messageShort from './short';

export default function messageQuote(message: Message.message | Message.messageService, title?: string) {
  let preview: Node | undefined;

  if (message._ === 'message' && message.media) {
    if (message.media._ === 'messageMediaPhoto' && message.media.photo && message.media.photo._ === 'photo') {
      preview = div`.quote__img`(photoRenderer(message.media.photo, { fit: 'cover', width: 32, height: 32 }));
    }

    if (message.media._ === 'messageMediaDocument' && message.media.document && message.media.document._ === 'document') {
      preview = div`.quote__img`(photoRenderer(message.media.document, { fit: 'cover', width: 32, height: 32 }));
    }
  }

  return quote(
    title || profileTitle(messageToSenderPeer(message)),
    message._ === 'message' && message.message ? message.message : messageShort(message),
    preview,
  );
}
