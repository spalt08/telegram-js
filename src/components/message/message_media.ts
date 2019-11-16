import { MessageMedia } from 'cache/types';
import mediaPhoto from './media/photo';
import mediaAnimatedSticker from './media/sticker_animated';
import './message_media.scss';

export default function messageMedia(media: MessageMedia): Node | null {
  switch (media._) {
    case 'messageMediaPhoto':
      return mediaPhoto(media.photo);

    case 'messageMediaDocument':
      console.log(media);

      if (media.document.mime_type === 'application/x-tgsticker') {
        return mediaAnimatedSticker(media.document);
      }
      break;

    default:
      return null;
  }

  return null;
}
