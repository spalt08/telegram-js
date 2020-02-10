import { Photo, MessageCommon } from 'cache/types';
import photoPreview from 'components/media/photo/preview';

export default function mediaPhoto(photo: Photo, message: MessageCommon) {
  const container = photoPreview(photo, message);

  return container;
}
