import { Peer, Message, MessagesFilter } from 'mtproto-js';
import { div } from 'core/html';
import { VirtualizedList } from 'components/ui';
import { BehaviorSubject } from 'rxjs';
import { media } from 'services';
import { messageCache } from 'cache';
import { useObservable } from 'core/hooks';
import { messageToId } from 'helpers/api';
import { unmount, mount } from 'core/dom';
import photoPreview from 'components/media/photo/preview';
import { getAttributeVideo } from 'helpers/files';
import videoPreview from 'components/media/video/preview';
import { panelLoader } from './loader';
import './media.scss';

const SEARCH_FILTER: MessagesFilter['_'] = 'inputMessagesFilterPhotoVideo';

const mediaRowRenderer = (ids: string, peer: Peer): HTMLDivElement => {
  const messages = ids.split('+');
  const container = div`.mediaPanel__row`();

  for (let i = 0; i < messages.length; i++) {
    const message = messageCache.get(messages[i]);
    const element = div`.mediaPanel__item`();

    // photo
    if (message?._ === 'message' && message.media?._ === 'messageMediaPhoto' && message.media.photo?._ === 'photo') {
      const photo = photoPreview(message.media.photo, peer, message, { fit: 'cover', width: 120, height: 120 });
      if (photo) mount(element, photo);
    }

    // video
    if (message?._ === 'message'
      && message.media?._ === 'messageMediaDocument'
      && message.media.document?._ === 'document'
      && getAttributeVideo(message.media.document)) {
      const photo = videoPreview(message.media.document, { fit: 'cover', width: 120, height: 120 });
      if (photo) mount(element, photo);
    }

    mount(container, element);
  }

  return container;
};

export default function mediaPanel(peer: Peer) {
  let loader: HTMLElement | undefined = panelLoader();
  const container = div`.mediaPanel`(loader);

  const loadMore = () => {
    media.loadMedia(peer, SEARCH_FILTER, messageCache.indices.photoVideos.getEarliestPeerMedia(peer)?.id);
  };

  const items = new BehaviorSubject<string[]>([]);
  const list = new VirtualizedList({
    items,
    pivotBottom: false,
    onReachBottom: loadMore,
    renderer: (id: string) => mediaRowRenderer(id, peer),
  });

  media.loadMedia(peer, SEARCH_FILTER);

  useObservable(container, messageCache.indices.photoVideos.getPeerMedia(peer), (messages: Message[]) => {
    if (!messages.length && media.isMediaLoading(peer, SEARCH_FILTER)) {
      return;
    }

    if (loader) {
      unmount(loader);
      mount(container, list.container);
      loader = undefined;
    }

    const ids = messages.map((message) => messageToId(message));
    const nextItems = [];

    // group by 3
    for (let i = 0; i < ids.length; i += 3) {
      nextItems.push(ids.slice(i, i + 3).join('+'));
    }

    items.next(nextItems);
  });

  return container;
}
