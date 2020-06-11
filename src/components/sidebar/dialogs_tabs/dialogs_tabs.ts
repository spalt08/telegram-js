import { map } from 'rxjs/operators';
import { DialogFilter } from 'mtproto-js';
import { status } from 'components/sidebar';
import { TabItem, tabsPanel } from 'components/ui';
import { dialog as dialogService, folder as folderService } from 'services';
import makeFilterIndex from 'services/folder/filterIndex';
import { div } from 'core/html';
import dialogsList from '../dialogs_list/dialogs_list';
import './dialogs_tabs.scss';

interface Props {
  className?: string;
}

function countToBadge(count: number): string {
  return count ? count.toString() : '';
}

function filterToTab(filter: Readonly<DialogFilter>): TabItem {
  const filterIndex = makeFilterIndex(filter, dialogService);

  return {
    key: `filter_${filter.id}`,
    title: filter.title,
    badge: filterIndex.unreadCount.pipe(map(countToBadge)),
    content: () => dialogsList(filterIndex, 'dialogsTabs__tab'),
  };
}

function filtersToTabs(filters: readonly Readonly<DialogFilter>[]): TabItem[] {
  return [
    {
      key: 'all',
      title: 'All',
      badge: folderService.allIndex.unreadCount.pipe(map(countToBadge)),
      content: () => dialogsList(folderService.allIndex, 'dialogsTabs__tab'),
    },
    ...filters.map(filterToTab),
  ];
}

export default function dialogsTabs({ className }: Props = {}) {
  return div(
    { className },
    status({ className: 'dialogsTabs__status' }),
    tabsPanel(
      {
        className: 'dialogsTabs__tabs',
        headerAlign: 'stretch',
        hideHeader: folderService.filters.pipe(map((filters) => filters.length === 0)),
      },
      folderService.filters.pipe(map(filtersToTabs)),
    ),
  );
}
