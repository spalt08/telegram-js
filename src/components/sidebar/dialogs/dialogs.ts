import { BehaviorSubject, combineLatest } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { DialogFilter } from 'mtproto-js';
import { useObservable } from 'core/hooks';
import { status } from 'components/sidebar';
import { VirtualizedList, sectionSpinner, TabItem, tabsPanel } from 'components/ui';
import { dialog as dialogService, folder as folderService } from 'services';
import { DialogListIndex } from 'services/folder/commonTypes';
import makeFilterIndex from 'services/folder/filterIndex';
import { mount, unmount } from 'core/dom';
import { div } from 'core/html';
import dialog from '../dialog/dialog';
import './dialogs.scss';

interface Props {
  className?: string;
}

function makeDialogList(dialogList: DialogListIndex) {
  const ids = new BehaviorSubject<readonly string[]>([]);
  const pinned = new BehaviorSubject<ReadonlySet<string>>(new Set());

  const listEl = new VirtualizedList({
    className: 'dialogs__list',
    items: ids,
    threshold: 2,
    batch: 20,
    pivotBottom: false,
    renderer(id) {
      return dialog(id, pinned.pipe(
        map((pinnedSet) => pinnedSet.has(id)),
        distinctUntilChanged(),
      ));
    },
    onReachBottom() {
      dialogService.loadMoreDialogs();
    },
  });

  // The indices observables are optimized to have only 1 subscription
  useObservable(
    listEl.container,
    dialogList.order,
    (order) => {
      ids.next(order.ids);
      pinned.next(order.pinned);
    },
  );

  return listEl.container;
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
    content: () => makeDialogList(filterIndex),
  };
}

function filtersToTabs(filters: readonly Readonly<DialogFilter>[]): TabItem[] {
  return [
    {
      key: 'all',
      title: 'All',
      badge: folderService.allIndex.unreadCount.pipe(map(countToBadge)),
      content: () => makeDialogList(folderService.allIndex),
    },
    ...filters.map(filterToTab),
  ];
}

export default function dialogs({ className }: Props = {}) {
  // fetch dialogs
  dialogService.updateDialogs();

  const showSpinnerObservable = combineLatest([dialogService.dialogs, dialogService.loading]).pipe(
    map(([dialogsList, isLoading]) => dialogsList.length === 0 && isLoading),
  );

  const element = div(
    { className },
    status({ className: 'dialogs__status' }),
    tabsPanel(
      {
        className: 'dialogs__tabs',
        headerAlign: 'stretch',
        hideHeader: folderService.filters.pipe(map((filters) => filters.length === 0)),
      },
      folderService.filters.pipe(map(filtersToTabs)),
    ),
  );

  let spinner: Node | undefined;

  useObservable(element, showSpinnerObservable, (show) => {
    if (show && !spinner) {
      mount(element, spinner = sectionSpinner({ className: 'dialogs__spinner' }));
    } else if (!show && spinner) {
      unmount(spinner);
      spinner = undefined;
    }
  });

  return element;
}
