import { Message } from 'mtproto-js';
import { quote } from 'components/ui';
import { messageToSenderPeer } from 'cache/accessors';
import { profileTitle } from 'components/profile';
import { div } from 'core/html';
import { getMessageDocument } from 'helpers/api';
import photoRenderer from 'components/media/photo/photo';
import messageShort from './short';

export default function messageQuote(message: Message.message | Message.messageService, title?: string) {
  let preview: Node | undefined;

  if (message._ === 'message' && message.media) {
    if (message.media._ === 'messageMediaPhoto' && message.media.photo && message.media.photo._ === 'photo') {
      preview = div`.quote__img`(photoRenderer(message.media.photo, { fit: 'cover', width: 32, height: 32 }));
    }

    const document = getMessageDocument(message);
    if (document?.thumbs) {
      preview = div`.quote__img`(photoRenderer(document, { fit: 'cover', width: 32, height: 32 }));
    }
  }

  return quote(
    title || profileTitle(messageToSenderPeer(message)),
    message._ === 'message' && message.message ? message.message : messageShort(message),
    preview,
  );
}
