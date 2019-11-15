import { Observable, Subject } from 'rxjs';
import binarySearch from 'binary-search';
import Collection from '../collection';

export default function orderBy<TItem>(compare: (item1: TItem, item2: TItem) => number) {
  return function orderByIndex<TId>(collection: Collection<TItem, TId, any>) {
    const orderCache: TId[] = [];
    const orderChange = new Subject<TId[]>();

    // Positive return - id is exactly on that cache index
    // Negative return - id can be inserted on (1 - n)'s index (after moving the rest cache)
    function getIdPosition(id: TId) {
      return binarySearch(orderCache, id, (id1, id2) => {
        const item1 = collection.get(id1);
        const item2 = collection.get(id2);
        if (item1 !== undefined && item2 !== undefined) {
          return compare(item1, item2);
        }
        if (item1 !== undefined) {
          return -1;
        }
        if (item2 !== undefined) {
          return 1;
        }
        return 0;
      });
    }

    collection.changes.subscribe(([action, item]) => {
      const id = collection.getId(item);

      switch (action) {
        case 'add':
          break;
        case 'update':
          break;
        case 'remove': {
          const position = getIdPosition(id);
          if (position >= 0) {
            orderCache.splice(position, 1);
          }
          break;
        }
        default:
      }
    });

    return {
      changes: orderChange as Observable<TId[]>,
    };
  };
}
