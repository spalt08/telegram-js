import { media, message } from 'services';
import { div } from 'core/html';
import { heading, searchInput, VirtualizedList } from 'components/ui';
import * as icons from 'components/icons';
import { useOnMount } from 'core/hooks';
import gifPreview from 'components/media/video/gif';
import './search_gifs.scss';
import { getAttributeVideo } from 'helpers/files';
import { documentToInputMedia } from 'helpers/message';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

// to do: refactor types
function renderGifForSearch(id: string) {
  const doc = media.foundGifsMap.get(id)!;
  const videoAttr = getAttributeVideo(doc)!;
  const { w, h } = videoAttr;

  const element = gifPreview(doc, { className: 'searchGifs__item', thumb: true, width: w, height: 100, fit: 'cover' }, undefined, (gif) => {
    message.sendMediaMessage(documentToInputMedia(gif));
  });
  console.log(element);

  element.style.width = `${(w / h) * 100}px`;

  return element;
}

export default function searchGifs({ onBack }: SidebarComponentProps) {
  const searchEl = searchInput({
    placeholder: 'Search GIFs',
    className: 'searchGifs__query',
    isLoading: media.isGifSearching,
    onChange: (q: string) => media.searchGifs(q),
  });

  const scroll = new VirtualizedList({
    items: media.foundGifs,
    renderer: renderGifForSearch,
    batch: 20,
    batchService: 15,
    threshold: 1,
    topReached: true,
    className: 'searchGifs__scroll',
    onReachBottom: () => media.searchGifsMore(),
  });

  const container = (
    div`.searchGifs`(
      heading({
        title: 'GIFs',
        element: searchEl,
        buttons: [
          { icon: icons.back, position: 'left', onClick: () => onBack && onBack() },
        ],
      }),
      scroll.container,
    )
  );

  useOnMount(container, () => media.searchGifs(''));

  return container;
}
