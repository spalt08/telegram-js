import { GetId } from '../fastStorages/collection';
import DictionaryStorage from './dictionaryStorage';

function getItemsRecord<TId extends keyof any, TItem>(items: TItem[], getId: GetId<TItem, TId>) {
  const itemsRecord = {} as Record<TId, TItem>;
  items.forEach((item) => {
    itemsRecord[getId(item)] = item;
  });
  return itemsRecord;
}

export default class CollectionStorage<TItem, TId extends (keyof any) & IDBValidKey> {
  private dictionary: DictionaryStorage<TId, TItem>;

  constructor(
    storeName: string, // IndexedDB store name. Don't forget to add it to the schema.
    private getId: GetId<TItem, TId>,
  ) {
    this.dictionary = new DictionaryStorage(storeName);
  }

  // Use `each` when possible to prevent creating an excess array in the memory
  public async getAll(): Promise<TItem[]> {
    const items: TItem[] = [];
    await this.each((item) => {
      items.push(item);
    });
    return items;
  }

  // The callback can return `false` to stop the iteration
  public each(callback: (item: TItem, id: TId) => false | void) {
    return this.dictionary.each((id, item) => callback(item, id));
  }

  public putMany(items: TItem[]) {
    return this.dictionary.putMany(getItemsRecord(items, this.getId));
  }

  public replaceAll(items: TItem[]) {
    return this.dictionary.putMany(getItemsRecord(items, this.getId));
  }
}
