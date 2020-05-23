import { Subject } from 'rxjs';
import binarySearch from 'binary-search';
import Collection from '../collection';

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Description for return value explanation
 */
export type CompareFunction<T> = (item1: Readonly<T>, item2: Readonly<T>) => number;

export type FilterFunction<T> = (item: Readonly<T>) => boolean;

export type ChangeEvent = ['add', number] | ['move', number, number] | ['remove', number];

function allIn() {
  return true;
}

export default function orderBy<TItem>(compare: CompareFunction<TItem>, filter: FilterFunction<TItem> = allIn) {
  return function orderIndex<TId extends keyof any = keyof any>(collection: Collection<TItem, any, TId>) {
    const orderCache: TId[] = [];
    const changeSubject = new Subject<ChangeEvent[]>();

    function getIdCurrentPosition(id: TId) {
      const rawValue = orderCache.indexOf(id);
      return rawValue >= 0 ? rawValue : undefined;
    }

    function getItemPositionToInsert(item: TItem) {
      const rawValue = binarySearch(orderCache, item, (id1, item2) => {
        const item1 = collection.get(id1);
        return item1 === undefined
          ? 1
          : compare(item1, item2);
      });
      return rawValue >= 0 ? (rawValue + 1) : (-rawValue - 1);
    }

    collection.changes.subscribe((collectionChanges) => {
      const indexChanges: ChangeEvent[] = [];

      collectionChanges.forEach(([action, item, id]) => {
        switch (action) {
          case 'add': {
            if (filter(item)) {
              const position = getItemPositionToInsert(item);
              orderCache.splice(position, 0, id);
              indexChanges.push(['add', position]);
            }
            break;
          }
          case 'update': {
            const oldPosition = getIdCurrentPosition(id);
            const mustBeInOrderCache = filter(item);

            if (!mustBeInOrderCache && oldPosition !== undefined) {
              // The item turned its filter value from true to false — remove
              orderCache.splice(oldPosition, 1);
              indexChanges.push(['remove', oldPosition]);
            } else if (mustBeInOrderCache && oldPosition === undefined) {
              // The item turned its filter value from false to true — add
              const newPosition = getItemPositionToInsert(item);
              orderCache.splice(newPosition, 0, id);
              indexChanges.push(['add', newPosition]);
            } else if (mustBeInOrderCache && oldPosition !== undefined) {
              // The item filter value was and is true — move
              orderCache.splice(oldPosition, 1); // Must remove it now to keep the list ordered to make the next line work correctly
              const newPosition = getItemPositionToInsert(item);
              orderCache.splice(newPosition, 0, id);
              if (oldPosition !== newPosition) {
                indexChanges.push(['move', oldPosition, newPosition]);
              }
            }
            break;
          }
          case 'remove': {
            const position = getIdCurrentPosition(id);
            if (position !== undefined) {
              orderCache.splice(position, 1);
              indexChanges.push(['remove', position]);
            }
            break;
          }
          default:
        }
      });

      if (indexChanges.length) {
        changeSubject.next(indexChanges);
      }
    });

    return {
      /**
       * @deprecated For debug only
       */
      orderCache,

      /**
       * Some events:
       * ['add', to] - item was added to the `to` order position
       * ['remove', from] - item was removed from the `from` order position
       * ['move', from, to] - item was moved from the `from` to the `to` order position
       */
      changes: changeSubject,

      getLength() {
        return orderCache.length;
      },

      getIdAt(index: number): TId {
        return orderCache[index];
      },

      getIds(start?: number, end?: number): Readonly<TId[]> {
        return start === undefined && end === undefined
          ? orderCache
          : orderCache.slice(start, end);
      },

      getItemAt(index: number) {
        return collection.get(this.getIdAt(index));
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
