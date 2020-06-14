import { Peer, Message } from 'mtproto-js';
import { div } from 'core/html';
import { VirtualizedList } from 'components/ui';
import { BehaviorSubject } from 'rxjs';
import { media } from 'services';
import { MessageChunkService } from 'services/message/message_chunk';
import { Direction } from 'services/message/types';
import { messageCache } from 'cache';
import { useWhileMounted } from 'core/hooks';
import { peerMessageToId } from 'helpers/api';
import { unmount, mount } from 'core/dom';
import webpageLink from 'components/media/webpage/webpage_link';
import { panelLoader } from './loader';
import './links.scss';

const linkRenderer = (id: string) => {
  const msg = messageCache.get(id) as Message.message;
  return webpageLink(msg);
};

export default function linksPanel(peer: Peer) {
  const items = new BehaviorSubject<string[]>([]);
  let mediaChunkService: MessageChunkService | undefined;

  const list = new VirtualizedList({
    items,
    pivotBottom: false,
    onReachBottom: () => mediaChunkService?.loadMore(Direction.Older),
    renderer: linkRenderer,
  });
  let loader: HTMLElement | undefined;
  const container = div`.linksPanel`(list.container);

  useWhileMounted(container, () => {
    const chunkService = media.getMediaMessagesChunk(peer, 'link', Infinity);
    mediaChunkService = chunkService;

    const historySubscription = chunkService.history.subscribe((history) => {
      items.next(history.ids.map((id) => peerMessageToId(peer, id)));

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
