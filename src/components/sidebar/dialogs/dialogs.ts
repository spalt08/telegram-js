import { BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { DialogFilter } from 'mtproto-js';
import { useObservable } from 'core/hooks';
import { status } from 'components/sidebar';
import { VirtualizedList, sectionSpinner, TabItem, tabsPanel } from 'components/ui';
import { dialog as dialogService, folder as folderService } from 'services';
import { ListItem } from 'services/folder/commonTypes';
import { mount, unmount } from 'core/dom';
import { div } from 'core/html';
import dialog from '../dialog/dialog';
import './dialogs.scss';

interface Props {
  className?: string;
}

function makeDialogList() {
  const dialogs = new BehaviorSubject<readonly ListItem[]>([]);
  const listEl = new VirtualizedList({
    className: 'dialogs__list',
    items: dialogs,
    threshold: 2,
    batch: 20,
    pivotBottom: false,
    renderer: dialog,
    onReachBottom: () => dialogService.loadMoreDialogs(),
  });
  useObservable(listEl.container, folderService.allIndex.order, (order) => dialogs.next(order));
  return listEl.container;
}

function filterToTab(filter: Readonly<DialogFilter>): TabItem {
  return {
    key: `filter_${filter.id}`,
    title: filter.title,
    content: makeDialogList,
  };
}

function filtersToTabs(filters: readonly Readonly<DialogFilter>[]): TabItem[] {
  return [
    {
      key: 'all',
      title: 'All',
      content: makeDialogList,
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
