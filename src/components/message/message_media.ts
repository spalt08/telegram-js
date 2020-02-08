<<<<<<< HEAD
import { MessageMedia, MessageCommon } from 'cache/types';
import { WithInterfaceHook } from 'core/hooks';
=======
import { MessageMedia } from 'cache/types';
>>>>>>> 0f339b03c11098eb9530aebd977e4e3a9aaed7b8
import mediaPhoto from './media/photo';
import mediaAnimatedSticker from './media/sticker_animated';
import mediaSticker from './media/sticker';
import './message_media.scss';

<<<<<<< HEAD
export interface Media {
  needsShadow(): boolean,
  getSize(): { width: number, height: number };
}

export default function messageMedia(media: MessageMedia, message: MessageCommon): HTMLElement & WithInterfaceHook<Media> | null {
=======
export default function messageMedia(media: MessageMedia) {
>>>>>>> 0f339b03c11098eb9530aebd977e4e3a9aaed7b8
  switch (media._) {
    case 'messageMediaPhoto':
      return mediaPhoto(media.photo, message);

    case 'messageMediaDocument':
      if (media.document.mime_type === 'application/x-tgsticker') {
        return mediaAnimatedSticker(media.document);
      }

      if (media.document.mime_type === 'image/webp') {
        return mediaSticker(media.document);
      }

      break;

    default:
      return null;
  }

  return null;
}
