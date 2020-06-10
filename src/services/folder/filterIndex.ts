import { Observable } from 'rxjs';
import { Dialog, DialogFilter } from 'mtproto-js';
import { peerToDialogId, inputPeerToPeer } from 'helpers/api';
import { areArraysEqual } from 'helpers/data';
import { dialogCache } from 'cache';
import { makeDialogMatchFilterChecker } from 'cache/accessors';
import DialogsService from '../dialog/dialog';
import makeUnreadCounter from './unreadCounter';
import getIdsList, { areItemsEqual } from './getIdsList';
import { DialogListIndex, ListItem } from './commonTypes';

export default function makeFilterIndex(filter: Readonly<DialogFilter>, dialogService: DialogsService): DialogListIndex {
  const pinned = new Set<string>();

  // Pinned go first and never reorder
  filter.pinned_peers.forEach((inputPeer) => {
    const peer = inputPeerToPeer(inputPeer);
    if (peer) {
      pinned.add(peerToDialogId(peer));
    }
  });

  dialogService.loadMissingDialogs(filter.pinned_peers);

  const doesMatchFilter = makeDialogMatchFilterChecker(filter);
  const isInIndex = (id: string, dialog: Dialog) => pinned.has(id) || doesMatchFilter(dialog);

  const unreadCountObservable = makeUnreadCounter(isInIndex);
  // const unreadCountSubject = new BehaviorSubject(0);
  // const unreadCountSubscription = unreadCountObservable.subscribe(unreadCountSubject);

  const orderObservable = new Observable<ListItem[]>((subscriber) => {
    let previousOrder = getIdsList(pinned, isInIndex);
    subscriber.next(previousOrder);

    const cacheSubscription = dialogCache.changes.subscribe(() => {
      const newOrder = getIdsList(pinned, isInIndex);

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
