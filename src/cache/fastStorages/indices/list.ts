import { Subject } from 'rxjs';
import Collection from '../collection';

type ChangeEvent<TId, TItem> = ['addToStart' | 'addToEnd' | 'remove', TId];

/**
 * Keeps items in the fixed order. Can only add items to start, end and remove items. Keeps only unique items.
 * Requires manual addition.
 */
export default function makeListIndex(allowMissingIds = false) {
  return function listIndex<TItem, TId extends keyof any = keyof any>(collection: Collection<TItem, any, TId>) {
    let list = new Set<TId>();
    const changes = new Subject<ChangeEvent<TId, TItem>[]>();

    collection.changes.subscribe((collectionChanges) => {
      const change: ChangeEvent<TId, TItem>[] = [];

      collectionChanges.forEach(([action, _item, id]) => {
        switch (action) {
          case 'remove':
            if (list.has(id)) {
              list.delete(id);
              change.push(['remove', id]);
            }
            break;
          default:
        }
      });

      if (change.length) {
        changes.next(change);
      }
    });

    return {
      changes,

      getIds(start?: number, end?: number) {
        if (start === undefined && end === undefined) {
          return [...list.values()];
        }

        const ids: TId[] = [];
        let index = 0;

        // eslint-disable-next-line no-restricted-syntax
        for (const id of list.values()) {
          if (start === undefined || index >= start) {
            if (end !== undefined && index >= end) {
              break;
            }
            ids.push(id);
          }
          ++index;
        }

        return ids;
      },

      getIdsSet(): ReadonlySet<TId> {
        return list;
      },

      eachId(callback: (id: TId) => void) {
        list.forEach(callback);
      },

      has(id: TId) {
        return list.has(id);
      },

      // When you add to start, the items will stay at the given order
      add(to: 'start' | 'end', ids: readonly TId[]) {
        const change: ChangeEvent<TId, TItem>[] = [];

        if (to === 'start') {
          const toAdd: TId[] = [];
          ids.forEach((id) => {
            if (allowMissingIds || collection.has(id)) {
              change.unshift(['addToStart', id]);
              toAdd.push(id);
            }
          });
          list = new Set([...toAdd, ...list]); // The Set constructor ignores the later duplicates
        } else {
          ids.forEach((id) => {
            if (allowMissingIds || collection.has(id)) {
              change.push(['addToEnd', id]);
              list.delete(id);
              list.add(id);
            }
          });
        }

        if (change.length) {
          changes.next(change);
        }
      },

      /** Removes only from the list */
      remove(ids: TId[]) {
        const change: ChangeEvent<TId, TItem>[] = [];

        ids.forEach((id) => {
          if (list.has(id)) {
            list.delete(id);
            change.push(['remove', id]);
          }
        });

        if (change.length) {
          changes.next(change);
        }
      },
    };
  };
}