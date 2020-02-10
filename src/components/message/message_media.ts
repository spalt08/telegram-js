import { MessageMedia, MessageCommon } from 'cache/types';
import { getAttributeSticker } from 'helpers/files';
import mediaPhoto from './media/photo';
import mediaSticker from './media/sticker';
import './message_media.scss';

export interface Media {
  needsShadow(): boolean,
  getSize(): { width: number, height: number };
}

export default function messageMedia(media: MessageMedia, message: MessageCommon) {
  switch (media._) {
    case 'messageMediaPhoto':
      return mediaPhoto(media.photo, message);

    case 'messageMediaDocument':
      if (getAttributeSticker(media.document)) {
        return mediaSticker(media.document);
      }
      break;

    default:
      return null;
  }

  return null;
}
