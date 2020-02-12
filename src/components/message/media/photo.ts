import { Photo, MessageCommon } from 'cache/types';
import photoPreview from 'components/media/photo/preview';

export default function mediaPhoto(photo: Photo, message: MessageCommon, adjustSize = true, showSpinner = true) {
  const container = photoPreview(photo, message, adjustSize, showSpinner);

  return container;
}
