import { messageCache } from 'cache';
import documentFile from 'components/media/document/file';
import { VirtualizedList } from 'components/ui';
import { mount, unmount, unmountChildren } from 'core/dom';
import { useMaybeObservable, useWhileMounted } from 'core/hooks';
import { div, nothing } from 'core/html';
import { MaybeObservable } from 'core/types';
import { getMessageDocument, peerMessageToId } from 'helpers/api';
import { Peer } from 'mtproto-js';
import { BehaviorSubject } from 'rxjs';
import { media } from 'services';
import { MessageChunkService } from 'services/message/message_chunk';
import { Direction } from 'services/message/types';
import './documents.scss';
import { panelLoader } from './loader';

const documentRowRenderer = (id: string) => {
  const msg = messageCache.get(id);
  const document = msg && getMessageDocument(msg);
  if (document) {
    return documentFile(document, msg);
  }
  return div(nothing);
};

export default function docsPanel(peer: MaybeObservable<Peer>) {
  const container = div`.documentsPanel`();
  useMaybeObservable(container, peer, true, (newPeer) => {
    unmountChildren(container);
    const items = new BehaviorSubject<string[]>([]);
    let mediaChunkService: MessageChunkService | undefined;

    const list = new VirtualizedList({
      items,
      pivotBottom: false,
      onReachBottom: () => mediaChunkService?.loadMore(Direction.Older),
      renderer: documentRowRenderer,
    });
    mount(container, list.container);
    let loader: HTMLElement | undefined;

    useWhileMounted(list.container, () => {
      const chunkService = media.getMediaMessagesChunk(newPeer, 'document', Infinity);
      mediaChunkService = chunkService;

      const historySubscription = chunkService.history.subscribe((history) => {
        items.next(history.ids.map((id) => peerMessageToId(newPeer, id)));

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
