import { distinctUntilChanged, map } from 'rxjs/operators';
import { status } from 'components/sidebar';
import { TabItem, tabsPanel } from 'components/ui';
import { folder as folderService } from 'services';
import { FilterRecord, UnreadCount } from 'services/folder/commonTypes';
import { div } from 'core/html';
import dialogsList from '../dialogs_list/dialogs_list';
import './dialogs_tabs.scss';

interface Props {
  className?: string;
}

function countToBadge({ count, hasUnmuted }: Readonly<UnreadCount>) {
  return !count ? undefined : {
    text: count.toString(),
    highlight: hasUnmuted,
  };
}

const allTab = {
  key: 'all',
  title: 'All',
  badge: folderService.allIndex.unreadCount.pipe(map(countToBadge)),
  content: () => dialogsList(folderService.allIndex, 'dialogsTabs__tab'),
};

function makeFilterDialogsList(id: number) {
  const indexObservable = folderService.filters.pipe(
    map((filters) => filters.get(id)?.index),
    distinctUntilChanged(),
  );
  return dialogsList(indexObservable, 'dialogsTabs__tab');
}

function filterToTab({ filter, index: filterIndex }: FilterRecord): TabItem {
  return {
    key: `filter_${filter.id}`,
    title: filter.title,
    badge: filterIndex.unreadCount.pipe(map(countToBadge)),
    content: () => makeFilterDialogsList(filter.id),
  };
}

function filtersToTabs(filters: readonly FilterRecord[]): TabItem[] {
  return [
    allTab,
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
        hideHeader: folderService.filters.pipe(map((filters) => filters.size === 0)),
      },
      folderService.filters.pipe(map((filters) => filtersToTabs([...filters.values()]))),
    ),
  );
}
