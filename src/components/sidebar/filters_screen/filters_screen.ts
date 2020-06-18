import { BehaviorSubject, combineLatest } from 'rxjs';
import { div, text } from 'core/html';
import { heading, VirtualizedList, sectionSpinner } from 'components/ui';
import * as icons from 'components/icons';
import { folder as folderService } from 'services';
import { useObservable, useOnMount } from 'core/hooks';
import filtersInfo from './filters_info';
import { addedFilterPreview } from './filter_preview';
import './filters_screen.scss';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

function renderListItem(item: string) {
  if (item === 'info') {
    return filtersInfo();
  }

  if (item === 'filtersHeader') {
    return div`.filtersScreen__header`(text('Folders'));
  }

  if (item === 'recommendedFiltersHeader') {
    return div`.filtersScreen__header`(text('Recommended folders'));
  }

  if (item === 'loading') {
    return div`.filtersScreen__loading`(sectionSpinner());
  }

  if (item.startsWith('filter_')) {
    return addedFilterPreview(Number(item.slice(7)));
  }

  return div();
}

export default function filtersScreen({ onBack }: SidebarComponentProps) {
  const listItems = new BehaviorSubject<string[]>([]);
  const listDriver = new VirtualizedList({
    items: listItems,
    threshold: 2,
    batch: 20,
    pivotBottom: false,
    topReached: true,
    className: 'filtersScreen__body',
    renderer: renderListItem,
  });

  const element = (
    div`.filtersScreen`(
      heading({
        title: 'Chats Folders',
        buttons: [{ icon: icons.back, position: 'left', onClick: () => onBack?.() }],
        className: 'filtersScreen__head',
      }),
      listDriver.container,
    )
  );

  useOnMount(element, () => {
    folderService.loadFiltersIfRequired();
  });

  const dataObservable = combineLatest([
    folderService.filters,
    folderService.isLoadingFilters,
  ]);

  useObservable(element, dataObservable, true, ([filters, isLoadingFilters]) => {
    const items = ['info'];

    if (filters.size > 0) {
      items.push('filtersHeader');
      filters.forEach((filter, filterId) => items.push(`filter_${filterId}`));
    } else if (isLoadingFilters) {
      items.push('loading');
    }

    listItems.next(items);
  });

  return element;
}
