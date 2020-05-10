import { Peer, Message, MessagesFilter } from 'mtproto-js';
import { div, nothing } from 'core/html';
import { VirtualizedList } from 'components/ui';
import { BehaviorSubject } from 'rxjs';
import { media } from 'services';
import { messageCache } from 'cache';
import { useObservable } from 'core/hooks';
import { messageToId } from 'helpers/api';
import { unmount, mount } from 'core/dom';
import documentFile from 'components/media/document/file';
import { panelLoader } from './loader';
import './documents.scss';

const SEARCH_FILTER: MessagesFilter['_'] = 'inputMessagesFilterDocument';

const documentRowRenderer = (id: string) => {
  const msg = messageCache.get(id);
  if (msg?._ === 'message' && msg.media?._ === 'messageMediaDocument' && msg.media.document?._ === 'document') {
    return documentFile(msg.media.document, msg);
  }
  return div(nothing);
};

export default function docsPanel(peer: Peer) {
  let loader: HTMLElement | undefined = panelLoader();
  const container = div`.documentsPanel`(loader);

  const loadMore = () => {
    media.loadMedia(peer, SEARCH_FILTER, messageCache.indices.documents.getEarliestPeerMedia(peer)?.id);
  };

  const items = new BehaviorSubject<string[]>([]);
  const list = new VirtualizedList({
    items,
    pivotBottom: false,
    onReachBottom: loadMore,
    renderer: documentRowRenderer,
  });

  media.loadMedia(peer, SEARCH_FILTER);

  useObservable(container, messageCache.indices.documents.getPeerMedia(peer), (messages: Message[]) => {
    if (!messages.length && media.isMediaLoading(peer, SEARCH_FILTER)) {
      return;
    }

    if (loader) {
      unmount(loader);
      mount(container, list.container);
      loader = undefined;
    }

    const ids = messages.map((message) => messageToId(message));

    items.next(ids);
  });

  return container;
}
