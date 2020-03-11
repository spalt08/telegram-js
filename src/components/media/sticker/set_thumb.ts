import { StickerSet } from 'client/schema';
import { div, img } from 'core/html';
import { getStickerSetThumbLocation } from 'helpers/photo';
import { download } from 'client/media';
import { mount, listen } from 'core/dom';
import { preloadTgsAssets, tgs } from 'components/ui';
import { getInterface } from 'core/hooks';
import { smile } from 'components/icons';
import './set_thumb.scss';

export default function stickerSetThumb(set: StickerSet) {
  if (!set.thumb || set.thumb._ !== 'photoSize') return div`.sticker-set-thumb`(smile());

  const container = div`.sticker-set-thumb`();

  const location = getStickerSetThumbLocation(set, set.thumb.location.volume_id, set.thumb.location.local_id);

  if (set.animated) {
    preloadTgsAssets();
  }

  download(location, set.thumb, (src: string) => {
    if (set.animated) {
      const thumb = tgs({ src, className: 'sticker-set-thumb__animated', autoplay: false, loop: true });

      mount(container, thumb);

      listen(thumb, 'mouseenter', getInterface(thumb).play);
      listen(thumb, 'mouseleave', getInterface(thumb).pause);
    } else {
      mount(container, img({ src, alt: set.title }));
    }
  });

  return container;
}
