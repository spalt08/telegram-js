import { MessageMedia } from 'cache/types';
import messageMediaPhoto from './message_media_photo';

export default function messageMedia(media: MessageMedia): Node | null {
  if (media._ === 'messageMediaPhoto') {
    return messageMediaPhoto(media.photo);
  }

  return null;
}
