import { Photo, MessageCommon, Peer } from 'cache/types';
import photoPreview from 'components/media/photo/preview';

export default function mediaPhoto(photo: Photo, peer: Peer, message: MessageCommon, adjustSize = true, showSpinner = true) {
  const container = photoPreview(photo, peer, message, adjustSize, showSpinner);

  return container;
}
