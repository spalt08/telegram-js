import Collection from '../collection';

/**
 * Keeps the order in which the items were added to the collection
 */
export default function addOrderIndex<TItem, TId extends keyof any = keyof any>(collection: Collection<TItem, any, TId>) {
  const orderCache = new Set<TId>();

  collection.changes.subscribe((collectionChanges) => {
    collectionChanges.forEach(([action, _item, id]) => {
      switch (action) {
        case 'add':
          orderCache.add(id);
          break;
        case 'remove':
          orderCache.delete(id);
          break;
        default:
      }
    });
  });

  return {
    // Latest first
    getIds() {
      return Array.from(orderCache.values());
    },

    eachId(callback: (id: TId) => void) {
      orderCache.forEach(callback);
    },

    /*
    getIdsIterator() {
      return orderCache.values();
    },
     */
  };
}
