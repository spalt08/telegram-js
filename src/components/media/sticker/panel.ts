import { div } from 'core/html';
import { media } from 'services';
import { materialSpinner } from 'components/icons';
import { useObservable } from 'core/hooks';
import { unmount, mount } from 'core/dom';
import { Document } from 'cache/types';
import stickerSet from './set';
import './panel.scss';

export default function stickerPanel(onSelect?: (sticker: Document) => void) {
  const loader = materialSpinner({ className: 'sticker-panel__loader' });
  const container = (
    div`.sticker-panel`(
      loader,
    )
  );

  let isLoaded = false;
  media.loadRecentStickers();

  useObservable(container, media.recentStickers, (stickers: Document[]) => {
    if (stickers.length > 0 && !isLoaded) {
      unmount(loader);
      mount(container, div`.sticker-panel__content`(
        stickerSet('Recent', stickers, onSelect),
      ));
      isLoaded = true;
    }
  });

  return container;
}
