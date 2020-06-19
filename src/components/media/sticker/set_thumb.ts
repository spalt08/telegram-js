import { div, img } from 'core/html';
import { getStickerSetThumbLocation, getSize, getPhotoLocation } from 'helpers/photo';
import { file } from 'client/media';
import { mount, watchVisibility, listen } from 'core/dom';
import * as icons from 'components/icons';
import './set_thumb.scss';
import { stickerSetCache } from 'cache';
import { useObservable } from 'core/hooks';
import { media } from 'services';

const stickerIndex = stickerSetCache.indices.stickers;

export default function stickerSetThumb(setId: string, onClick: (item: string) => void) {
  const set = stickerSetCache.get(setId);

  if (!set) return div();

  const image = img`.sticker-set-thumb__image`();
  const container = div`.sticker-set-thumb`();

  if (setId === 'recent') {
    mount(container, icons.recent({ className: 'sticker-set-thumb__icon' }));
  } else {
    if (set.thumb && !set.animated) {
      const size = getSize([set.thumb], 64, 64);

      if (size) {
        image.src = file(getStickerSetThumbLocation(set, size.location.volume_id, size.location.local_id), { dc_id: set.thumb_dc_id });
        if (!image.parentElement) mount(container, image);
      }
    } else {
      useObservable(container, stickerIndex.readySubject(setId), true, (isLoaded) => {
        if (isLoaded && !image.src) {
          const first = stickerIndex.getFirst(setId);
          if (first && first.thumbs) {
            const size = getSize(first.thumbs, 64, 64);
            if (size) {
              image.src = file(getPhotoLocation(first, size.type), { dc_id: first.dc_id });
              if (!image.parentElement) mount(container, image);
            }
          }
        }
      });
    }

    watchVisibility(container, (isVisible) => {
      if (isVisible && !image.src) {
        media.loadStickerSet(setId);
      }
    });
  }

  listen(container, 'click', () => onClick(setId));

  return container;
}
