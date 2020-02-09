import { Document } from 'cache/types';
import { useInterface } from 'core/hooks';
import stickerRenderer from 'components/media/sticker/sticker';

export default function mediaSticker(document: Document) {
  const sticker = stickerRenderer(document, { size: '200px', autoplay: true });

  return useInterface(sticker, {
    needsShadow: false,
    getSize() {
      return { width: 200, height: 200 };
    },
  });
}
