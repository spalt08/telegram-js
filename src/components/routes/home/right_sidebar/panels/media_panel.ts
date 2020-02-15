import { Peer, Message, MessageFilter } from 'cache/types';
import { div } from 'core/html';
import { VirtualizedList } from 'components/ui';
import { BehaviorSubject } from 'rxjs';
import { materialSpinner } from 'components/icons';
import { media } from 'services';
import { messageCache } from 'cache';
import { useObservable } from 'core/hooks';
import { messageToId } from 'helpers/api';
import { unmount, mount } from 'core/dom';
import photoPreview from 'components/media/photo/preview';
import { getAttributeVideo } from 'helpers/files';
import videoPreview from 'components/media/video/preview';

const SEARCH_FILTER: MessageFilter['_'] = 'inputMessagesFilterPhotoVideo';

const mediaRowRenderer = (ids: string, peer: Peer): HTMLDivElement => {
  const messages = ids.split('+');
  const container = div`.shared-media__mediarow`();

  for (let i = 0; i < messages.length; i++) {
    const message = messageCache.get(messages[i]);
    const element = div`.shared-media__mediaitem`();

    // photo
    if (message && message._ === 'message' && message.media._ === 'messageMediaPhoto') {
      const photo = photoPreview(message.media.photo, peer, message, { fit: 'cover', width: 120, height: 120 });
      if (photo) mount(element, photo);
    }

    // video
    if (message && message._ === 'message' && message.media._ === 'messageMediaDocument' && getAttributeVideo(message.media.document)) {
      const photo = videoPreview(message.media.document, { fit: 'cover', width: 120, height: 120 });
      if (photo) mount(element, photo);
    }

    mount(container, element);
  }

  return container;
};

export default function mediaPanel(peer: Peer) {
  let loader: HTMLElement | undefined = div`.shared-media__loader`(materialSpinner());
  const container = div`.shared-media__item`(loader);

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
