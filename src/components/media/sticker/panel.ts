import { div } from 'core/html';
import { media } from 'services';
import { materialSpinner, recent } from 'components/icons';
import { useObservable, useInterface, getInterface, useOnMount } from 'core/hooks';
import { Document, StickerSet } from 'cache/types';
import { mount, unmount, listen } from 'core/dom';
import { BehaviorSubject } from 'rxjs';
import { VirtualizedList } from 'components/ui';
import stickerSet from './set';
import stickerSetThumb from './set_thumb';
import stickerSetRecent from './set_recent';
import './panel.scss';

export default function stickerPanel(onSelect?: (sticker: Document) => void) {
  let loader: SVGSVGElement | undefined = materialSpinner({ className: 'sticker-panel__loader' });

  const tabs = {
    recent: div`.sticker-panel__tab`(recent()),
  } as Record<string, HTMLElement>;

  const tabsEl = div`.sticker-panel__tabs`(tabs.recent);

  const items = new BehaviorSubject<string[]>([]);

  const renderer = (id: string) => {
    if (id === 'recent') return stickerSetRecent(onSelect);

    for (let i = 0; i < media.stickerSets.value.length; i += 1) {
      if (media.stickerSets.value[i].id === id) return stickerSet(media.stickerSets.value[i], onSelect);
    }

    return div();
  };

  const list = new VirtualizedList({
    className: 'sticker-panel__list',
    items,
    renderer,
    batch: 1,
    threshold: 1,
    pivotBottom: false,
  });

  listen(tabs.recent, 'click', () => list.focus('recent'));

  const innerContainer = div`.sticker-panel__container`(loader);
  const container = (
    div`.sticker-panel`(
      innerContainer,
      tabsEl,
    )
  );

  // load sets
  useObservable(container, media.stickerSets, (sets: StickerSet[]) => {
    if (sets.length > 0) {
      const newSets = [];

      for (let i = 0; i < sets.length; i += 1) {
        const set = sets[i];

        if (!tabs[set.id]) {
          tabs[set.id] = div`.sticker-panel__tab`(stickerSetThumb(set));

          mount(tabsEl, tabs[set.id]);

          listen(tabs[set.id], 'click', () => {
            list.focus(set.id, list.current.indexOf(set.id) > list.current.indexOf(list.topElement || '') ? -1 : 1);
          });
        }

        if (items.value.indexOf(set.id) === -1) newSets.push(set.id);
      }

      if (loader) {
        unmount(loader);
        loader = undefined;
        mount(innerContainer, list.container);
      }

      items.next([...items.value, ...newSets]);
    }
  });

  let times = 0;
  // load recent
  useObservable(container, media.recentStickers, (stickers: Document[]) => {
    times++;

    if ((stickers.length > 0 || times > 1) && items.value.indexOf('recent') === -1) {
      items.next(['recent', ...items.value]);

      if (loader) {
        unmount(loader);
        loader = undefined;
        mount(innerContainer, list.container);
      }

      media.loadStickerSets();
    }
  });

  useOnMount(container, () => {
    media.loadRecentStickers();
  });

  return useInterface(container, {
    update() {},
    shouldRemove() {
      for (let i = list.first; i <= list.last; i++) {
        if (list.elements[list.current[i]]) getInterface(list.elements[list.current[i]] as ReturnType<typeof stickerSet>).pauseAll();
      }
    },
    didAppear() {
      for (let i = list.first; i <= list.last; i++) {
        if (list.elements[list.current[i]]) getInterface(list.elements[list.current[i]] as ReturnType<typeof stickerSet>).playAll();
      }
    },
  });
}
