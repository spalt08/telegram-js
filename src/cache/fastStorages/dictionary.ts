import { BehaviorSubject, Subject } from 'rxjs';
import { useWhileMounted } from 'core/hooks';
import { WithMin } from '../types';

type ItemListener<T> = (item: Readonly<T> | undefined) => void;

/**
 * Stores key-value pairs
 */
export default class Dictionary<TKeyProp extends keyof any, TItem extends { [key in TKeyProp]: keyof any }> {
  protected data: Record<TItem[TKeyProp], Readonly<TItem>>;

  /**
   * Notifies about all changes of the dictionary. Don't use it if you need to watch a single item.
   */
  public readonly changeSubject = new Subject<['add' | 'update' | 'remove', Readonly<TItem>]>();

  protected itemsListeners = {} as Record<TItem[TKeyProp], ItemListener<TItem>[]>;

  constructor(
    protected keyProp: TKeyProp,
    protected considerMin = true, // If true, items with .min=true won't replace items with .min=false
    data = {} as Record<TItem[TKeyProp], Readonly<TItem>>,
  ) {
    this.data = { ...data };
  }

  /**
   * Checks if the item with the given key exists in the dictionary
   */
  public has(key: TItem[TKeyProp]): boolean {
    return key in this.data;
  }

  /**
   * Gets the item with the given key
   */
  public get(key: TItem[TKeyProp]): Readonly<TItem> | undefined {
    return this.data[key];
  }

  /**
   * Gets all items
   */
  public getAll(): Readonly<Record<TItem[TKeyProp], Readonly<TItem>>> {
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
  public put(items: Readonly<TItem> | Readonly<TItem>[]) {
    if (Array.isArray(items)) {
      items.forEach((item) => this.putOne(item));
    } else {
      this.putOne(items);
    }
  }

  /**
   * Removes the item with the given key. If there is no such item, does nothing.
   */
  public remove(key: TItem[TKeyProp]) {
    if (this.has(key)) {
      const item = this.data[key];
      delete this.data[key];
      this.notify('remove', item);
    }
  }

  /**
   * Replaces all the items in the dictionary with the given items
   */
  public replaceAll(items: Readonly<TItem>[]) {
    const toPutKeys = new Set<TItem[TKeyProp]>();
    const toRemove: Array<TItem[TKeyProp]> = [];

    items.forEach((item) => toPutKeys.add(item[this.keyProp]));

    (Object.keys(this.data) as Array<TItem[TKeyProp]>).forEach((key) => {
      if (!toPutKeys.has(key)) {
        toRemove.push(key);
      }
    });

    toRemove.forEach((key) => this.remove(key));
    this.put(items);
  }

  /**
   * Add a listener to the item in the dictionary. Undefined value means that the item has been removed.
   * The return value is a function to call to unsubscribe. Call it when the watcher is unmounted to prevent memory leaks.
   */
  public watchItem(key: TItem[TKeyProp], notifyNow: boolean, onChange: ItemListener<TItem>): () => void {
    if (!this.itemsListeners[key]) {
      this.itemsListeners[key] = [];
    }

    this.itemsListeners[key].push(onChange);
    if (notifyNow) {
      onChange(this.get(key));
    }

    return this.unwatchItem.bind(this, key, onChange);
  }

  /**
   * A DOM hook to listen to an item change while the element is mounted
   */
  public useWatchItem(base: unknown, key: TItem[TKeyProp], notifyOnStartWatching: boolean, onChange: ItemListener<TItem>) {
    return useWhileMounted(base, () => this.watchItem(key, notifyOnStartWatching, onChange));
  }

  /**
   * Makes a behavior subject that is updated only while the element is mounted.
   * This subject can be subscribed on directly.
   */
  public useItemBehaviorSubject(base: unknown, key: TItem[TKeyProp]): BehaviorSubject<Readonly<TItem> | undefined> {
    let lastNotifiedItem = this.get(key);
    const subject = new BehaviorSubject(lastNotifiedItem);
    this.useWatchItem(base, key, true, (item) => {
      if (item !== lastNotifiedItem) {
        lastNotifiedItem = item;
        subject.next(item);
      }
    });
    return subject;
  }

  protected putOne(item: Readonly<TItem>) {
    const key = item[this.keyProp];
    const currentItem = this.data[key];
    if (currentItem) {
      if (item !== currentItem) {
        if (!this.considerMin || (currentItem as WithMin<TItem>).min) {
          this.data[key] = item;
          this.notify('update', item);
        }
      }
    } else {
      this.data[key] = item;
      this.notify('add', item);
    }
  }

  protected notify(action: 'add' | 'update' | 'remove', item: Readonly<TItem>) {
    if (this.changeSubject.observers.length > 0) {
      this.changeSubject.next([action, item]);
    }

    const key = item[this.keyProp];
    if (this.itemsListeners[key]) {
      this.itemsListeners[key].forEach((listener) => {
        try {
          listener(action === 'remove' ? undefined : item);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error);
        }
      });
    }
  }

  protected unwatchItem(key: TItem[TKeyProp], onChange: ItemListener<TItem>) {
    if (this.itemsListeners[key]) {
      const index = this.itemsListeners[key].indexOf(onChange);
      if (index >= 0) {
        this.itemsListeners[key].splice(index, 1);
        if (this.itemsListeners[key].length === 0) {
          delete this.itemsListeners[key];
        }
      }
    }
  }
}
