import { messageCache } from 'cache';
import photoPreview from 'components/media/photo/preview';
import videoPreview from 'components/media/video/preview';
import { VirtualizedList } from 'components/ui';
import { mount, unmount, unmountChildren } from 'core/dom';
import { useMaybeObservable, useWhileMounted } from 'core/hooks';
import { div, text } from 'core/html';
import { MaybeObservable } from 'core/types';
import { peerMessageToId } from 'helpers/api';
import { Peer } from 'mtproto-js';
import { BehaviorSubject } from 'rxjs';
import { media as service } from 'services';
import { MessageChunkService } from 'services/message/message_chunk';
import { Direction } from 'services/message/types';
import { isiOS, isAndroid } from 'helpers/browser';
import { panelLoader } from './loader';
import './media.scss';

function renderer(id: string): HTMLElement {
  const message = messageCache.get(id);
  if (!message || message._ !== 'message') return div`.mediaPanel__item`();
  const { media } = message;

  // photo
  if (media && media._ === 'messageMediaPhoto' && media.photo && media.photo._ === 'photo') {
    return div`.mediaPanel__item`(
      photoPreview(media.photo, { fit: 'cover', width: 240, height: 240, className: 'mediaPanel__photo' }, message),
    );
  }

  // video
  if (media && media._ === 'messageMediaDocument' && media.document && media.document._ === 'document') {
    return div`.mediaPanel__item`(
      videoPreview(media.document, { fit: 'cover', width: 240, height: 240, className: 'mediaPanel__photo' }, message),
    );
  }

  return div`.mediaPanel__item`();
}

function renderGroup(code: string): HTMLElement {
  const [month, year] = code.split('_');
  const date = new Date(+year, +month, 1);

  return div`.mediaPanel__day`(
    div`.mediaPanel__daylabel`(text(date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))),
  );
}

function getMessageMonth(map: Map<string, string>, id: string) {
  let day = map.get(id);

  if (!day) {
    const message = messageCache.get(id);
    if (message && message._ !== 'messageEmpty') {
      const date = new Date(message.date * 1000);
      map.set(id, day = `${date.getMonth()}_${date.getFullYear()}`);
    }
  }

  return day || '0';
}

export default function mediaPanel(peer: MaybeObservable<Peer>) {
  const container = div`.mediaPanel`();
  const monthMap = new Map<string, string>();

  useMaybeObservable(container, peer, true, (newPeer) => {
    unmountChildren(container);
    monthMap.clear();

    const items = new BehaviorSubject<string[]>([]);

    let mediaChunkService: MessageChunkService;

    const list = new VirtualizedList({
      items,
      pivotBottom: false,
      topReached: true,
      batchService: isiOS || isAndroid ? 15 : 25,
      batch: 9,
      renderer,
      renderGroup,
      selectGroup: (id: string) => getMessageMonth(monthMap, id),
      groupPadding: 30,
      onReachBottom: () => mediaChunkService.loadMore(Direction.Older),
    });

    mount(container, list.container);

    let loader: HTMLElement | undefined;

    useWhileMounted(list.container, () => {
      mediaChunkService = service.getMediaMessagesChunk(newPeer, 'photoVideo', Infinity);

      const subscription = mediaChunkService.history.subscribe(({ ids, loadingOlder }) => {
        items.next(ids.map((id) => peerMessageToId(newPeer, id)));

        const showLoader = ids.length === 0 && loadingOlder;

        if (!showLoader && loader) {
          unmount(loader);
          loader = undefined;
        } else if (showLoader && !loader) {
          mount(container, loader = panelLoader());
        }
      });

      return () => {
        mediaChunkService.destroy();
        subscription.unsubscribe();
      };
    });
  });

  return container;
}
