import { BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { DialogListIndex } from 'services/folder/commonTypes';
import { sectionSpinner, VirtualizedList } from 'components/ui';
import { dialog as dialogService } from 'services';
import { useMaybeObservableMaybeObservable, useObservable } from 'core/hooks';
import { div } from 'core/html';
import { mount, unmount } from 'core/dom';
import { MaybeObservable } from 'core/types';
import dialog from '../dialog/dialog';
import './dialogs_list.scss';

export default function dialogsList(dialogList: MaybeObservable<DialogListIndex | undefined>, className: string = '') {
  // The dialog list indices observables are optimized to have only 1 subscription so separate subjects are created to store the data
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
    topReached: true,
    renderer(id) {
      return dialog(
        id,
        pinned.pipe(map((pinnedSet) => pinnedSet.has(id))),
      );
    },
    onReachBottom() {
      dialogService.loadMoreDialogs();
    },
  });

  const container = div`.dialogsList ${className}`(
    listDriver.container,
  );
  let spinner: Node | undefined;

  useObservable(container, loading, true, (show) => {
    if (show && !spinner) {
      mount(container, spinner = sectionSpinner({ className: 'dialogsList__spinner' }));
    } else if (!show && spinner) {
      unmount(spinner);
      spinner = undefined;
    }
  });

  useMaybeObservableMaybeObservable(
    container,
    dialogList,
    (listIndex) => listIndex?.order,
    true,
    (order) => {
      if (order) {
        ids.next(order.ids);
        pinned.next(order.pinned);
      }
    },
  );

  return container;
}
