import { media } from 'services';
import { div } from 'core/html';
import { heading, searchInput, VirtualizedList } from 'components/ui';
import * as icons from 'components/icons';
import './search_stickers.scss';
import { useOnMount } from 'core/hooks';
import stickerSetCovered from 'components/media/sticker/set_covered';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

export default function searchStickers({ onBack }: SidebarComponentProps) {
  const searchEl = searchInput({
    placeholder: 'Search Stickers',
    className: 'searchStickers__query',
    isLoading: media.isStickerSearching,
    onChange: (q: string) => q ? media.searchStickerSets(q) : media.loadFeaturedStickers(),
  });

  const scroll = new VirtualizedList({
    items: media.foundStickers,
    renderer: (id) => stickerSetCovered(id),
    topReached: true,
    batch: 8,
    batchService: 8,
    threshold: 0.5,
    pivotBottom: false,
    className: 'searchStickers__content',
  });

  const container = (
    div`.searchStickers`(
      heading({
        title: 'Stickers',
        element: searchEl,
        buttons: [
          { icon: icons.back, position: 'left', onClick: () => onBack && onBack() },
        ],
      }),
      scroll.container,
    )
  );

  useOnMount(container, () => media.loadFeaturedStickers());

  return container;
}
