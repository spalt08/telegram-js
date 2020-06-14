import { Peer } from 'mtproto-js';
import { div } from 'core/html';
import { VirtualizedList } from 'components/ui';
import { BehaviorSubject } from 'rxjs';
import { media } from 'services';
import { MessageChunkService } from 'services/message/message_chunk';
import { Direction } from 'services/message/types';
import { messageCache } from 'cache';
import { useWhileMounted } from 'core/hooks';
import { mount, unmount } from 'core/dom';
import photoPreview from 'components/media/photo/preview';
import { getAttributeVideo } from 'helpers/files';
import { peerMessageToId } from 'helpers/api';
import videoPreview from 'components/media/video/preview';
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
  const grouppedIds: string[] = [];
  for (let i = 0; i < ids.length; i += 3) {
    grouppedIds.push(`${
      peerMessageToId(peer, ids[i])
    }+${
      peerMessageToId(peer, ids[i + 1])
    }+${
      peerMessageToId(peer, ids[i + 2])
    }`);
  }
  return grouppedIds;
}

export default function mediaPanel(peer: Peer) {
  const items = new BehaviorSubject<string[]>([]);
  let mediaChunkService: MessageChunkService | undefined;

  const list = new VirtualizedList({
    items,
    pivotBottom: false,
    onReachBottom: () => mediaChunkService?.loadMore(Direction.Older),
    renderer: (id: string) => mediaRowRenderer(id, peer),
  });
  let loader: HTMLElement | undefined;
  const container = div`.mediaPanel`(list.container);

  useWhileMounted(container, () => {
    const chunkService = media.getMediaMessagesChunk(peer, 'photoVideo', Infinity);
    mediaChunkService = chunkService;

    const historySubscription = chunkService.history.subscribe((history) => {
      items.next(groupIds(peer, history.ids));

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

  return container;
}
