import { div } from 'core/html';
import { media } from 'services';
import { materialSpinner, recent } from 'components/icons';
import { useObservable, useInterface, getInterface } from 'core/hooks';
import { Document, StickerSet } from 'mtproto-js';
import { mount, unmount, listen, animationFrameStart } from 'core/dom';
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
    threshold: 2,
    pivotBottom: false,
  });

  listen(tabs.recent, 'click', () => list.focus('recent'));

  const container = (
    div`.sticker-panel`(
      loader,
      tabsEl,
    )
  );

  // load sets
  useObservable(container, media.stickerSets, (sets: StickerSet[]) => {
    if (sets.length > 0) {
      const newSets: string[] = [];

      for (let i = 0; i < sets.length; i += 1) {
        const set = sets[i];

        if (!tabs[set.id]) {
          tabs[set.id] = div`.sticker-panel__tab`(stickerSetThumb(set));

          mount(tabsEl, tabs[set.id]);

          listen(tabs[set.id], 'click', () => {
            list.focus(set.id, list.items.indexOf(set.id) > list.items.indexOf(list.top || '') ? -1 : 1);
          });
        }

        if (items.value.indexOf(set.id) === -1) newSets.push(set.id);
      }

      if (loader) {
        mount(container, list.container, loader);
        unmount(loader);
        loader = undefined;
      }

      animationFrameStart().then(() => {
        items.next([...items.value, ...newSets]);
      });
    }
  });

  let times = 0;
  // load recent
  useObservable(container, media.recentStickers, (stickers: Document[]) => {
    times++;

    if ((stickers.length > 0 || times > 1) && items.value.indexOf('recent') === -1) {
      items.next(['recent', ...items.value]);

      if (loader) {
        mount(container, list.container, loader);
        unmount(loader);
        loader = undefined;
      }

      media.loadStickerSets();
    }
  });

  return useInterface(container, {
    update() {},
    shouldRemove() {
      for (let i = list.firstRendered; i <= list.lastRendered; i++) {
        if (list.elements[list.items[i]]) getInterface(list.elements[list.items[i]] as ReturnType<typeof stickerSet>).pauseAll();
      }
    },
    didAppear() {
      media.loadRecentStickers();

      // for (let i = list.firstRendered; i <= list.lastRendered; i++) {
      //   if (list.elements[list.items[i]]) getInterface(list.elements[list.items[i]] as ReturnType<typeof stickerSet>).playAll();
      // }
    },
  });
}
