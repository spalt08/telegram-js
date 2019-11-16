import { Subject } from 'rxjs';
import binarySearch from 'binary-search';
import Collection from '../collection';

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Description for return value explanation
 */
export type CompareFunction<T> = (item1: Readonly<T>, item2: Readonly<T>) => number;

export default function orderBy<TItem>(compare: CompareFunction<TItem>) {
  return function orderIndex<TId extends keyof any = keyof any>(collection: Collection<TItem, any, TId>) {
    const orderCache: TId[] = [];
    const changeSubject = new Subject<['add', number] | ['move', number, number] | ['remove', number]>();

    function getIdCurrentPosition(id: TId) {
      const rawValue = orderCache.indexOf(id);
      return rawValue >= 0 ? rawValue : undefined;
    }

    function getItemPositionToInsert(item: TItem) {
      const rawValue = binarySearch(orderCache, item, (id1: TId, item2: TItem) => {
        const item1 = collection.get(id1);
        return item1 === undefined
          ? 1
          : compare(item1, item2);
      });
      return rawValue >= 0 ? (rawValue + 1) : (-rawValue - 1);
    }

    collection.changes.subscribe(([action, item]) => {
      const id = collection.getId(item);

      switch (action) {
        case 'add': {
          const position = getItemPositionToInsert(item);
          orderCache.splice(position, 0, id);
          changeSubject.next(['add', position]);
          break;
        }
        case 'update': {
          const oldPosition = getIdCurrentPosition(id);
          if (oldPosition !== undefined) {
            orderCache.splice(oldPosition, 1); // Must remove it now to keep the list ordered to make the next line work correctly
            const newPosition = getItemPositionToInsert(item);
            orderCache.splice(newPosition, 0, id);
            if (oldPosition !== newPosition) {
              changeSubject.next(['move', oldPosition, newPosition]);
            }
          }
          break;
        }
        case 'remove': {
          const position = getIdCurrentPosition(id);
          if (position !== undefined) {
            orderCache.splice(position, 1);
            changeSubject.next(['remove', position]);
          }
          break;
        }
        default:
      }
    });

    return {
      /**
       * Some events:
       * ['add', to] - item was added to the `to` order position
       * ['remove', from] - item was removed from the `from` order position
       * ['move', from, to] - item was moved from the `from` to the `to` order position
       */
      changeSubject,

      getIds(start?: number, end?: number): Readonly<TId[]> {
        return start === undefined && end === undefined
          ? orderCache
          : orderCache.slice(start, end);
      },

      getItems(start?: number, end?: number) {
        const items: Readonly<TItem>[] = [];
        this.getIds(start, end).forEach((id) => {
          const item = collection.get(id);
          if (item !== undefined) {
            items.push(item);
          }
        });
        return items;
      },
    };
  };
}
