import { messageCache } from 'cache';
import photoPreview from 'components/media/photo/preview';
import videoPreview from 'components/media/video/preview';
import { VirtualizedList } from 'components/ui';
import { mount, unmount, unmountChildren } from 'core/dom';
import { useMaybeObservable, useWhileMounted } from 'core/hooks';
import { div } from 'core/html';
import { MaybeObservable } from 'core/types';
import { peerMessageToId } from 'helpers/api';
import { getAttributeVideo } from 'helpers/files';
import { Peer } from 'mtproto-js';
import { BehaviorSubject } from 'rxjs';
import { media } from 'services';
import { MessageChunkService } from 'services/message/message_chunk';
import { Direction } from 'services/message/types';
import { panelLoader } from './loader';
import './media.scss';

const mediaRowRenderer = (ids: string, peer: Peer): HTMLDivElement => {
  const messages = ids.split('+');
  const container = div`.mediaPanel__row`();

  for (let i = 0; i < messages.length; i++) {
    const message = messageCache.get(messages[i]);
    if (message?._ !== 'message') {
      continue;
    }

    const element = div`.mediaPanel__item`();

    // photo
    if (message.media?._ === 'messageMediaPhoto' && message.media.photo?._ === 'photo') {
      const photo = photoPreview(message.media.photo, peer, message, { fit: 'cover', width: 120, height: 120 });
      if (photo) mount(element, photo);
    }

    // video
    if (
      message.media?._ === 'messageMediaDocument'
      && message.media.document?._ === 'document'
      && getAttributeVideo(message.media.document)) {
      const photo = videoPreview(message.media.document, { fit: 'cover', width: 120, height: 120 });
      if (photo) mount(element, photo);
    }

    mount(container, element);
  }

  return container;
};

function groupIds(peer: Peer, ids: readonly number[]): string[] {
  const groupedIds: string[] = [];
  for (let i = 0; i < ids.length; i += 3) {
    groupedIds.push(`${peerMessageToId(peer, ids[i])}+${peerMessageToId(peer, ids[i + 1])}+${peerMessageToId(peer, ids[i + 2])}`);
  }
  return groupedIds;
}

export default function mediaPanel(peer: MaybeObservable<Peer>) {
  const container = div`.mediaPanel`();
  useMaybeObservable(container, peer, true, (newPeer) => {
    unmountChildren(container);
    const items = new BehaviorSubject<string[]>([]);
    let mediaChunkService: MessageChunkService | undefined;

    const list = new VirtualizedList({
      items,
      pivotBottom: false,
      onReachBottom: () => mediaChunkService?.loadMore(Direction.Older),
      renderer: (id: string) => mediaRowRenderer(id, newPeer),
    });
    mount(container, list.container);
    let loader: HTMLElement | undefined;

    useWhileMounted(list.container, () => {
      const chunkService = media.getMediaMessagesChunk(newPeer, 'photoVideo', Infinity);
      mediaChunkService = chunkService;

      const historySubscription = chunkService.history.subscribe((history) => {
        items.next(groupIds(newPeer, history.ids));

        const showLoader = history.ids.length === 0 && history.loadingOlder;
        if (!showLoader && loader) {
          unmount(loader);
          loader = undefined;
        } else if (showLoader && !loader) {
          mount(container, loader = panelLoader());
        }
      });

      return () => {
        chunkService.destroy();
        historySubscription.unsubscribe();
      };
    });
  });

  return container;
}
