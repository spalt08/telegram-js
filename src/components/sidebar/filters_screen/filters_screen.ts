import { BehaviorSubject, combineLatest } from 'rxjs';
import { div, text } from 'core/html';
import { heading, VirtualizedList, sectionSpinner } from 'components/ui';
import * as icons from 'components/icons';
import { folder as folderService } from 'services';
import { useObservable, useOnMount } from 'core/hooks';
import filtersInfo from './filters_info';
import { addedFilterPreview, suggestedFilterPreview } from './filter_preview';
import './filters_screen.scss';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

function renderListItem(item: string) {
  if (item === 'info') {
    return filtersInfo();
  }

  if (item === 'filtersHeader') {
    return div`.filtersScreen__header`(text('Folders'));
  }

  if (item === 'suggesterFiltersHeader') {
    return div`.filtersScreen__header`(text('Recommended folders'));
  }

  if (item === 'loading') {
    return div`.filtersScreen__loading`(sectionSpinner());
  }

  if (item.startsWith('filter_')) {
    return addedFilterPreview(Number(item.slice(7)));
  }

  if (item.startsWith('suggestedFilter_')) {
    return suggestedFilterPreview(Number(item.slice(16)));
  }

  if (process.env.NODE_ENV) {
    // eslint-disable-next-line no-console
    console.error(`Unknown filters list item "${item}", ignoring it. Please check the code for typos.`);
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
    folderService.loadSuggestedFilters();
  });

  const dataObservable = combineLatest([
    folderService.filters,
    folderService.isLoadingFilters,
    folderService.suggestedFilters,
    folderService.isLoadingSuggestedFilters,
  ]);

  useObservable(element, dataObservable, true, ([filters, isLoadingFilters, suggestedFilters, isLoadingSuggestedFilters]) => {
    const items = ['info'];

    if (filters && filters.size > 0) {
      items.push('filtersHeader');
      filters.forEach((filter, filterId) => items.push(`filter_${filterId}`));
    } else if (isLoadingFilters) {
      items.push('loading');
    }

    // todo: Fix the list scrolling up when suggested filters are loaded
    if (suggestedFilters && suggestedFilters.size > 0) {
      items.push('suggesterFiltersHeader');
      suggestedFilters.forEach((filter, filterId) => items.push(`suggestedFilter_${filterId}`));
    } else if (isLoadingSuggestedFilters) {
      items.push('loading');
    }

    listItems.next(items);
  });

  return element;
}
