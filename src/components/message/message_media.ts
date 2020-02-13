import { MessageMedia, MessageCommon, Peer } from 'cache/types';
import { getAttributeSticker } from 'helpers/files';
import mediaPhoto from './media/photo';
import mediaSticker from './media/sticker';
import './message_media.scss';

export default function messageMedia(media: MessageMedia, peer: Peer, message: MessageCommon) {
  switch (media._) {
    case 'messageMediaPhoto':
      return mediaPhoto(media.photo, peer, message);

    case 'messageMediaDocument':
      if (getAttributeSticker(media.document)) {
        return mediaSticker(media.document);
      }
      // console.log(media);
      break;

    default:
      // console.log(media);
      return null;
  }

  return null;
}
