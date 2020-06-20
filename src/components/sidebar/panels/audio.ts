import { messageCache } from 'cache';
import { useContextMenu } from 'components/global_context_menu';
import { eye1 } from 'components/icons';
import audio from 'components/media/audio/audio';
import { VirtualizedList } from 'components/ui';
import { mount, unmount, unmountChildren } from 'core/dom';
import { useMaybeObservable, useWhileMounted } from 'core/hooks';
import { div } from 'core/html';
import { MaybeObservable } from 'core/types';
import { peerMessageToId } from 'helpers/api';
import { Message, Peer } from 'mtproto-js';
import { BehaviorSubject } from 'rxjs';
import { media, message } from 'services';
import { MessageChunkService } from 'services/message/message_chunk';
import { Direction } from 'services/message/types';
import './audio.scss';
import { panelLoader } from './loader';

const audioRenderer = (id: string) => {
  const msg = messageCache.get(id) as Message.message;
  const audioEl = audio(msg, true);
  useContextMenu(audioEl, [{
    icon: () => eye1(),
    label: 'Go To Message',
    onClick: () => message.selectPeer(msg.to_id, msg.id),
  }]);
  return audioEl;
};

export default function audioPanel(peer: MaybeObservable<Peer>, type: 'music' | 'voice') {
  const container = div`.linksPanel`();
  useMaybeObservable(container, peer, true, (newPeer) => {
    unmountChildren(container);
    const items = new BehaviorSubject<string[]>([]);
    let mediaChunkService: MessageChunkService | undefined;

    const list = new VirtualizedList({
      items,
      pivotBottom: false,
      onReachBottom: () => mediaChunkService?.loadMore(Direction.Older),
      renderer: audioRenderer,
    });
    mount(container, list.container);
    let loader: HTMLElement | undefined;

    useWhileMounted(list.container, () => {
      const chunkService = media.getMediaMessagesChunk(newPeer, type, Infinity);
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
