import { StickerSet } from 'cache/types';
import { div, img } from 'core/html';
import { getStickerSetThumbLocation } from 'helpers/photo';
import media from 'client/media';
import { mount, listen } from 'core/dom';
import { tgs } from 'components/ui';
import { getInterface } from 'core/hooks';
import { smile } from 'components/icons';
import './set_thumb.scss';

export default function stickerSetThumb(set: StickerSet) {
  if (!set.thumb || set.thumb._ !== 'photoSize') return div`.sticker-set-thumb`(smile());

  const container = div`.sticker-set-thumb`();

  const location = getStickerSetThumbLocation(set, set.thumb.location.volume_id, set.thumb.location.local_id);

  media.get(location, (src: string) => {
    if (set.animated) {
      const thumb = tgs({ src, className: 'sticker-set-thumb__animated', autoplay: false });

      mount(container, thumb);

      listen(thumb, 'mouseenter', getInterface(thumb).play);
      listen(thumb, 'mouseleave', getInterface(thumb).pause);
    } else mount(container, img({ src, alt: set.title }));
  }, set.thumb_dc_id);

  return container;
}