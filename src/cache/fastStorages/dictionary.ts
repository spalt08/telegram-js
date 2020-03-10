import { BehaviorSubject, Subject } from 'rxjs';
import { useWhileMounted } from 'core/hooks';
import BatchActions from 'helpers/batchActions';

export type ItemWatcher<TItem> = (item: Readonly<TItem> | undefined) => void;

export type ChangeEvent<TItem, TKey> = ['add' | 'update' | 'remove', TKey, Readonly<TItem>];

/**
 * A simple storage for key-value pairs. Allows to subscribe to changes.
 */
export default class Dictionary<TKey extends keyof any, TItem> {
  /**
   * Notifies about all changes of the dictionary. Don't use it if you need to watch a single item.
   */
  public readonly changes = new Subject<ChangeEvent<TItem, TKey>[]>();

  protected data: Record<TKey, Readonly<TItem>>;

  protected changesBatch = new BatchActions((events: ChangeEvent<TItem, TKey>[]) => {
    if (this.changes.observers.length > 0) {
      this.changes.next(events);
    }
  });

  protected itemsWatchers = {} as Record<TKey, ItemWatcher<TItem>[]>;

  constructor(
    protected considerMin = true, // If true, items with .min=true won't replace items with .min=false
    data = {} as Record<TKey, Readonly<TItem>>,
  ) {
    this.data = { ...data };
  }

  /**
   * Checks if the item with the given key exists in the dictionary
   */
  public has(key: TKey): boolean {
    return key in this.data;
  }

  /**
   * Gets the item with the given key
   */
  public get(key: TKey): Readonly<TItem> | undefined {
    return this.data[key];
  }

  /**
   * Gets all items
   */
  public getAll(): Readonly<Record<TKey, Readonly<TItem>>> {
    return this.data;
  }

  /**
   * Counts the contained items
   */
  public count(): number {
    return Object.keys(this.data).length;
  }

  /**
   * Adds or updates the item in the dictionary
   */
  public put(key: TKey, item: Readonly<TItem>): void;
  public put(items: Readonly<Record<TKey, Readonly<TItem>>>): void;
  public put(arg1: any, arg2?: any) {
    if (arg2 === undefined) {
      this.batchChanges(() => {
        (Object.keys(arg1) as TKey[]).forEach((key) => this.putOne(key, arg1[key]));
      });
    } else {
      this.putOne(arg1, arg2);
    }
  }

  /**
   * Partially updates the item in the dictionary. If the item doesn't exist, changes nothing.
   */
  public change(key: TKey, itemUpdate: Readonly<Partial<TItem>>): void;
  public change(itemUpdates: Readonly<Record<TKey, Readonly<Partial<TItem>>>>): void;
  public change(arg1: any, arg2?: any) {
    if (arg2 === undefined) {
      this.batchChanges(() => {
        (Object.keys(arg1) as TKey[]).forEach((key) => this.changeOne(key, arg1[key]));
      });
    } else {
      this.changeOne(arg1, arg2);
    }
  }

  /**
   * Removes the item with the given key. If there is no such item, does nothing.
   */
  public remove(key: TKey) {
    if (this.has(key)) {
      const item = this.data[key];
      delete this.data[key];
      this.notify('remove', key, item);
    }
  }

  /**
   * Removes all items from dictionary
   */
  public empty() {
    this.data = {} as Record<TKey, Readonly<TItem>>;
  }

  /**
   * Replaces all the items in the dictionary with the given items
   */
  public replaceAll(items: Readonly<Record<TKey, Readonly<TItem>>>) {
    const toRemove: Array<TKey> = [];

    (Object.keys(this.data) as Array<TKey>).forEach((key) => {
      if (!(key in items)) {
        toRemove.push(key);
      }
    });

    this.batchChanges(() => {
      toRemove.forEach((key) => this.remove(key));
      this.put(items);
    });
  }

  /**
   * Add a listener to the item in the dictionary. Undefined value means that the item has been removed.
   * The return value is a function to call to unsubscribe. Call it when the watcher is unmounted to prevent memory leaks.
   */
  public watchItem(key: TKey, onChange: ItemWatcher<TItem>): () => void {
    if (!this.itemsWatchers[key]) {
      this.itemsWatchers[key] = [];
    }

    this.itemsWatchers[key].push(onChange);
    return this.unwatchItem.bind(this, key, onChange);
  }

  /**
   * Makes a behavior subject that is updated only while the element is mounted for an item with the given key.
   * This subject can be subscribed on directly without memory leaks concerns.
   */
  public useItemBehaviorSubject(base: Node, key: TKey): BehaviorSubject<Readonly<TItem> | undefined> {
    const subject = new BehaviorSubject(this.get(key));
    useWhileMounted(base, () => {
      const item = this.get(key);
      if (subject.value !== item) {
        subject.next(item);
      }
      return this.watchItem(key, (newItem) => subject.next(newItem));
    });
    return subject;
  }

  /**
   * Batches all the changes made on this dictionary so that the dictionary triggers only 1 event in changeSubject
   */
  public batchChanges(run: () => void) {
    this.changesBatch.batch(run);
  }

  protected putOne(key: TKey, item: Readonly<TItem>) {
    const currentItem = this.data[key];
    if (currentItem) {
      if (item !== currentItem) {
        let itemToPut: Readonly<TItem>;

        if (this.considerMin && (currentItem as any).min) {
          const { min, ...itemWithoutMin } = item as any;
          itemToPut = { ...currentItem, ...itemWithoutMin };
        } else {
          itemToPut = item;
        }

        this.data[key] = itemToPut;
        this.notify('update', key, itemToPut);
      }
    } else {
      this.data[key] = item;
      this.notify('add', key, item);
    }
  }

  protected changeOne(key: TKey, itemUpdate: Readonly<Partial<TItem>>) {
    if (!this.data[key]) {
      return;
    }

    this.data[key] = { ...this.data[key], ...itemUpdate };
    this.notify('update', key, this.data[key]);
  }

  protected notify(action: 'add' | 'update' | 'remove', key: TKey, item: Readonly<TItem>) {
    this.changesBatch.act([action, key, item]);

    if (this.itemsWatchers[key]) {
      this.itemsWatchers[key].forEach((listener) => {
        try {
          listener(action === 'remove' ? undefined : item);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error);
        }
      });
    }
  }

  protected unwatchItem(key: TKey, onChange: ItemWatcher<TItem>) {
    if (this.itemsWatchers[key]) {
      const index = this.itemsWatchers[key].indexOf(onChange);
      if (index >= 0) {
        this.itemsWatchers[key].splice(index, 1);
        if (this.itemsWatchers[key].length === 0) {
          delete this.itemsWatchers[key];
        }
      }
    }
  }
}
