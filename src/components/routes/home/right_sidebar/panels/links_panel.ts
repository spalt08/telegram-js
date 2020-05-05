import { Peer, Message, MessagesFilter } from 'mtproto-js';
import { div } from 'core/html';
import { VirtualizedList } from 'components/ui';
import { BehaviorSubject } from 'rxjs';
import { materialSpinner } from 'components/icons';
import { media } from 'services';
import { messageCache } from 'cache';
import { useObservable } from 'core/hooks';
import { messageToId } from 'helpers/api';
import { unmount, mount } from 'core/dom';
import webpageLink from 'components/media/webpage/webpage_link';

const SEARCH_FILTER: MessagesFilter['_'] = 'inputMessagesFilterUrl';

const linkRenderer = (id: string) => {
  const msg = messageCache.get(id) as Message.message;
  return webpageLink(msg);
};

export default function linksPanel(peer: Peer) {
  let loader: HTMLElement | undefined = div`.shared-media__loader`(materialSpinner());
  const container = div`.shared-media__item`(loader);

  const loadMore = () => {
    media.loadMedia(peer, SEARCH_FILTER, messageCache.indices.links.getEarliestPeerMedia(peer)?.id);
  };

  const items = new BehaviorSubject<string[]>([]);
  const list = new VirtualizedList({
    items,
    pivotBottom: false,
    onReachBottom: loadMore,
    renderer: linkRenderer,
  });

  media.loadMedia(peer, SEARCH_FILTER);

  useObservable(container, messageCache.indices.links.getPeerMedia(peer), (messages: Message[]) => {
    if (!messages.length && media.isMediaLoading(peer, SEARCH_FILTER)) {
      return;
    }

    if (loader) {
      unmount(loader);
      mount(container, list.container);
      loader = undefined;
    }

    const ids = messages
      .map((message) => messageToId(message));

    items.next(ids);
  });

  return container;
}
