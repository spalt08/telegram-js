import { merge, Observable } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Dialog } from 'mtproto-js';
import { areArraysEqual } from 'helpers/data';
import { isDialogInFolder } from 'helpers/api';
import { dialogCache } from 'cache';
import makeUnreadCounter from './unreadCounter';
import getIdsList from './getIdsList';
import { DialogListIndex, DialogListOrder } from './commonTypes';

export default function makeFolderIndex(folderId: number): DialogListIndex {
  const isInIndex = (id: string, dialog: Dialog) => dialog._ === 'dialog' && isDialogInFolder(dialog, folderId);

  const unreadCountObservable = makeUnreadCounter(isInIndex);
  // const unreadCountSubject = new BehaviorSubject(0);
  // const unreadCountSubscription = unreadCountObservable.subscribe(unreadCountSubject);

  const getPinned = () => {
    const pinned = new Set<string>();

    dialogCache.indices.pinned.eachId((id) => {
      const dialog = dialogCache.get(id);
      if (dialog && isInIndex(id, dialog)) {
        pinned.add(id);
      }
    });

    return pinned;
  };

  const orderObservable = new Observable<DialogListOrder>((subscriber) => {
    let lastPinned: ReadonlySet<string> | undefined;
    let lastIds: readonly string[];

    let currentPinned = getPinned();
    const pinnedSubscription = dialogCache.indices.pinned.changes.subscribe(() => {
      currentPinned = getPinned();
    });

    const handleUpdate = () => {
      const currentIds = getIdsList(currentPinned, isInIndex);

      if (currentPinned !== lastPinned || !lastIds || !areArraysEqual(lastIds, currentIds)) {
        lastPinned = currentPinned;
        lastIds = currentIds;
        subscriber.next({ ids: lastIds, pinned: lastPinned });
      }
    };

    const cacheSubscription = merge(dialogCache.changes, dialogCache.indices.pinned.changes)
      .pipe(debounceTime(0)) // Order and pin updates often go one after another so a debounce is added to batch them
      .subscribe(handleUpdate);

    handleUpdate();

    return () => {
      pinnedSubscription.unsubscribe();
      cacheSubscription.unsubscribe();
    };
  });

  return {
    unreadCount: unreadCountObservable,
    order: orderObservable,
  };
}
