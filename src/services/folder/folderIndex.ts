import { combineLatest, Observable } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Dialog } from 'mtproto-js';
import { areArraysEqual } from 'helpers/data';
import { isDialogInFolder } from 'helpers/api';
import { dialogCache } from 'cache';
import makeUnreadCounter from './unreadCounter';
import getIdsList, { areItemsEqual } from './getIdsList';
import { DialogListIndex, ListItem } from './commonTypes';

export default function makeFolderIndex(folderId: number): DialogListIndex {
  const isInIndex = (id: string, dialog: Dialog) => isDialogInFolder(dialog, folderId);

  const unreadCountObservable = makeUnreadCounter(isInIndex);
  // const unreadCountSubject = new BehaviorSubject(0);
  // const unreadCountSubscription = unreadCountObservable.subscribe(unreadCountSubject);

  const getFolderIdsList = () => getIdsList(dialogCache.indices.pinned.getIdsSet(), isInIndex);

  const orderObservable = new Observable<ListItem[]>((subscriber) => {
    let previousOrder = getFolderIdsList();
    subscriber.next(previousOrder);

    const cacheSubscription = combineLatest([dialogCache.changes, dialogCache.indices.pinned.changes])
      .pipe(debounceTime(0)) // Order and pin updates often go one ofter another so a debounce is added to batch them
      .subscribe(() => {
        const newOrder = getFolderIdsList();

        if (!areArraysEqual(previousOrder, newOrder, areItemsEqual)) {
          previousOrder = newOrder;
          subscriber.next(newOrder);
        }
      });

    return () => cacheSubscription.unsubscribe();
  });

  return {
    unreadCount: unreadCountObservable,
    order: orderObservable,
  };
}
