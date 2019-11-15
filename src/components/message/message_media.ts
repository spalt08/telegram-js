import { MessageMedia } from 'cache/types';
import mediaPhoto from './media/photo';
import './message_media.scss';

export default function messageMedia(media: MessageMedia): Node | null {
  switch (media._) {
    case 'messageMediaPhoto':
      return mediaPhoto(media.photo);
    default:
      return null;
  }
}
