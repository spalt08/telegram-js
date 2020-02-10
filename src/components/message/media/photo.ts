import { Photo, MessageCommon } from 'cache/types';
import { useInterface, getInterface } from 'core/hooks';
import photoPreview from 'components/media/photo/preview';

export default function mediaPhoto(photo: Photo, message: MessageCommon) {
  const container = photoPreview(photo, message);

  return useInterface(container, {
    needsShadow: true,
    getSize() {
      return getInterface(container)!.getSize();
    },
  });
}
