import { BehaviorSubject } from 'rxjs';
import { DialogFilter } from 'mtproto-js';
import { peerToDialogId, inputPeerToPeer } from 'helpers/api';
import { insertIntoOrderedArray } from 'helpers/data';
import { dialogCache } from 'cache';
import { compareDialogs, makeDialogMatchFilterChecker } from 'cache/accessors';
import DialogsService from '../dialog/dialog';

export interface FilterIndex {
  list: BehaviorSubject<{ ids: [string/* dialogId */, boolean?/* isPinned */][], complete: boolean }>;
  unreadCount: BehaviorSubject<number>;
  destroy(): void;
}

export default function makeFilterIndex(filter: Readonly<DialogFilter>, dialogService: DialogsService): FilterIndex {
  const ids: [string, boolean?][] = [];
  const pinned = new Set<string>();

  // Pinned go first and never reorder
  filter.pinned_peers.map((inputPeer) => {
    const peer = inputPeerToPeer(inputPeer);
    if (peer) {
      const peerId = peerToDialogId(peer);
      ids.push([peerId, true]);
      pinned.add(peerId);
    }
  });

  dialogService.loadMissingDialogs(filter.pinned_peers);

  const doesDialogMatch = makeDialogMatchFilterChecker(filter);

  // Add existing dialogs
  dialogCache.indices.addOrder.eachId((dialogId) => {
    if (pinned.has(dialogId)) {
      return;
    }

    const dialog = dialogCache.get(dialogId)!;
    if (!doesDialogMatch(dialog)) {
      return;
    }

    insertIntoOrderedArray(
      ids,
      [dialogId, false],
      ([cachedDialogId]) => compareDialogs(dialogCache.get(cachedDialogId[0])!, dialog),
      pinned.size,
    );
  });

  return {
    list: new BehaviorSubject({ ids, complete: false }),
    unreadCount: new BehaviorSubject(0),
    destroy() {},
  };
}
