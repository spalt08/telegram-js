import { div } from 'core/html';
import { media } from 'services';
import { materialSpinner } from 'components/icons';
import { useObservable, useInterface, getInterface } from 'core/hooks';
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
  let setEl: ReturnType<typeof stickerSet> | undefined;

  media.loadRecentStickers();

  useObservable(container, media.recentStickers, (stickers: Document[]) => {
    if (stickers.length > 0 && !isLoaded) {
      setEl = stickerSet('Recent', stickers, onSelect);
      unmount(loader);
      mount(container, div`.sticker-panel__content`(
        setEl,
      ));
      isLoaded = true;
    }
  });


  return useInterface(container, {
    update() {},
    shouldRemove() {
      if (setEl) getInterface(setEl).pauseAll();
    },
    didAppear() {
      if (setEl) getInterface(setEl).playAll();
    },
  });
}
