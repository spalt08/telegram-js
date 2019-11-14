import { BehaviorSubject, Subject } from 'rxjs';
import { WithMin } from '../types';

/**
 * Stores key-value pairs
 */
export default class Dictionary<TKey extends keyof any, TItem extends { [key in TKey]: keyof any }> {
  protected data: Record<TItem[TKey], Readonly<TItem>>;

  /**
   * Notifies about all updates of the dictionary. Don't use it if you need to watch a single item.
   */
  public readonly changeSubject = new Subject<['add' | 'update' | 'remove', TItem]>();

  protected itemsChangeSubjects = {} as Record<TItem[TKey], BehaviorSubject<TItem | undefined>[]>;

  constructor(
    protected keyProp: TKey,
    protected considerMin = true, // If true, items with .min=true won't replace items with .min=false
    data = {} as Record<TItem[TKey], Readonly<TItem>>,
  ) {
    this.data = { ...data };
  }

  /**
   * Checks if the item with the given key exists in the dictionary
   */
  public has(key: TItem[TKey]): boolean {
    return key in this.data;
  }

  /**
   * Gets the item with the given key
   */
  public get(key: TItem[TKey]): Readonly<TItem> | undefined {
    return this.data[key];
  }

  /**
   * Gets all items
   */
  public getAll(): Readonly<Record<TItem[TKey], Readonly<TItem>>> {
    return this.data;
  }

  /**
   * Adds or updates the item in the dictionary
   */
  public put(items: Readonly<TItem> | Readonly<TItem>[]) {
    if (Array.isArray(items)) {
      for (let i = 0; i < items.length; ++i) {
        this.putOne(items[i]);
      }
    } else {
      this.putOne(items);
    }
  }

  /**
   * Removes the item with the given key. If there is no such item, does nothing.
   */
  public remove(key: TItem[TKey]) {
    if (this.has(key)) {
      const item = this.data[key];
      delete this.data[key];
      this.notify('remove', item);
    }
  }

  /**
   * Makes a behavior subject that watches for changes of the given item.
   * The return array contains the values:
   *  1. The subject to subscribe to and get the latest item value. Undefined means that the item has been removed.
   *  2. The function to call to stop notifying the subject. Call it when the watcher is unmounted to prevent memory leaks.
   */
  public watchItem(key: TItem[TKey]): [BehaviorSubject<TItem | undefined>, () => void] {
    if (!this.itemsChangeSubjects[key]) {
      this.itemsChangeSubjects[key] = [];
    }

    const subject = new BehaviorSubject(this.get(key));
    this.itemsChangeSubjects[key].push(subject);

    return [subject, this.unwatchItem.bind(this, key, subject)];
  }

  protected putOne(item: Readonly<TItem>) {
    const key = item[this.keyProp];
    if (!this.considerMin || !this.has(key) || (this.data[key] as WithMin<TItem>).min) {
      const action = this.has(key) ? 'update' : 'add';
      this.data[key] = item;
      this.notify(action, item);
    }
  }

  protected notify(action: 'add' | 'update' | 'remove', item: TItem) {
    this.changeSubject.next([action, item]);

    const key = item[this.keyProp];
    if (this.itemsChangeSubjects[key]) {
      for (let i = 0; i < this.itemsChangeSubjects[key].length; ++i) {
        this.itemsChangeSubjects[key][i].next(action === 'remove' ? undefined : item);
      }
    }
  }

  protected unwatchItem(key: TItem[TKey], subject: BehaviorSubject<TItem | undefined>) {
    if (this.itemsChangeSubjects[key]) {
      const index = this.itemsChangeSubjects[key].indexOf(subject);
      if (index >= 0) {
        this.itemsChangeSubjects[key].splice(index, 1);
        if (this.itemsChangeSubjects[key].length === 0) {
          delete this.itemsChangeSubjects[key];
        }
      }
    }
  }
}
