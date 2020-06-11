import { BehaviorSubject, combineLatest } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { DialogListIndex } from 'services/folder/commonTypes';
import { sectionSpinner, VirtualizedList } from 'components/ui';
import { dialog as dialogService } from 'services';
import { useObservable } from 'core/hooks';
import { div } from 'core/html';
import { mount, unmount } from 'core/dom';
import dialog from '../dialog/dialog';
import './dialogs_list.scss';

export default function dialogsList(dialogList: DialogListIndex, className: string = '') {
  const ids = new BehaviorSubject<readonly string[]>([]);
  const pinned = new BehaviorSubject<ReadonlySet<string>>(new Set());
  const loading = combineLatest([ids, dialogService.loading]).pipe(
    map(([list, isLoading]) => list.length === 0 && isLoading),
  );

  const listDriver = new VirtualizedList({
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

  const container = div`.dialogsList ${className}`(
    listDriver.container,
  );
  let spinner: Node | undefined;

  useObservable(container, loading, (show) => {
    if (show && !spinner) {
      mount(container, spinner = sectionSpinner({ className: 'dialogsList__spinner' }));
    } else if (!show && spinner) {
      unmount(spinner);
      spinner = undefined;
    }
  });

  // The indices observables are optimized to have only 1 subscription
  useObservable(
    container,
    dialogList.order,
    (order) => {
      ids.next(order.ids);
      pinned.next(order.pinned);
    },
  );

  return container;
}
