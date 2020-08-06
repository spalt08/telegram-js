
import { Document } from 'mtproto-js';
import { BehaviorSubject } from 'rxjs';
import { stickerSetCache } from 'cache';
import { div } from 'core/html';
import { media } from 'services';
import { materialSpinner } from 'components/icons';
import { useOnMount, useWhileMounted } from 'core/hooks';
import { VirtualizedList, simpleList } from 'components/ui';
import { unmount } from 'core/dom';
import stickerSetThumb from './set_thumb';
import stickerSet from './set';
import './panel.scss';

export default function stickerPanel(onSelect?: (sticker: Document) => void) {
  let isRequested = false;

  const loader = materialSpinner({ className: 'sticker-panel__loader' });
  const items = new BehaviorSubject<readonly string[]>([]);

  const list = new VirtualizedList({
    className: 'sticker-panel__list',
    items,
    renderer: (id) => stickerSet(id, onSelect),
    batch: 2,
    batchService: 2,
    threshold: 0.5,
    topReached: true,
  });

  const tabs = simpleList({
    props: { className: 'sticker-panel__tabs' },
    items,
    render: (id) => stickerSetThumb(id, (sid) => list.focus(sid)),
  });

  const container = (
    div`.sticker-panel`(
      loader,
      tabs,
      list.container,
    )
  );

  const savedIndex = stickerSetCache.indices.saved;
  useWhileMounted(container, () => {
    items.next(savedIndex.getIds());

    const subscription = savedIndex.changes.subscribe(() => {
      items.next(savedIndex.getIds());
      if (items.value.length > 0) unmount(loader);
    });

    return () => subscription.unsubscribe();
  });

  useOnMount(container, () => {
    if (!isRequested) {
      isRequested = true;
      media.loadSavedStickers();
    }
  });

  return container;
}
