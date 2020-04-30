import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { mapObject } from 'helpers/data';
import Dictionary, { ItemMerger, ItemWatcher } from './dictionary';

export type GetId<TItem, TId extends keyof any> = (item: Readonly<TItem>) => TId;

export type IndexFactory<TItem, TId extends keyof any, TIndex> = (collection: Collection<TItem, any, TId>) => TIndex;

export type IndicesFactories<TItem, TId extends keyof any> = Record<keyof any, IndexFactory<TItem, TId, any>>;

export type IndicesFromFactories<T extends IndicesFactories<any, any>> = {
  [K in keyof T]: T[K] extends IndexFactory<any, any, infer TIndex> ? TIndex : never;
};

export interface Options<TItem, TIndices, TId extends keyof any> {
  getId: GetId<TItem, TId>;
  itemMerger?: ItemMerger<TItem>;
  indices?: TIndices;
  data?: Readonly<TItem>[];
}

export type ChangeEvent<TItem> = ['add' | 'update' | 'remove', Readonly<TItem>];

export function makeGetIdFromProp<
  TIdProp extends keyof any,
  TItem extends Record<TIdProp, keyof any>
>(prop: TIdProp): GetId<TItem, TItem[TIdProp]> {
  return (item) => item[prop];
}

export default class Collection<TItem, TIndices extends IndicesFactories<any, any>, TId extends keyof any = keyof any> {
  public getId: GetId<TItem, TId>;

  public readonly changes: Observable<ChangeEvent<TItem>[]>;

  public readonly indices: IndicesFromFactories<TIndices>;

  protected readonly storage: Dictionary<TId, TItem>;

  constructor({
    getId,
    itemMerger,
    indices = {} as TIndices,
    data = [],
  }: Options<TItem, TIndices, TId>) {
    this.storage = new Dictionary(itemMerger);
    this.getId = getId;
    this.changes = this.storage.changes.pipe(map(
      (events) => events.map(
        ([action, _key, item]) => [action, item],
      ),
    ));
    this.indices = mapObject(indices, (indexFactory) => indexFactory(this)) as IndicesFromFactories<TIndices>;
    this.put(data);
  }

  public has(id: TId) {
    return this.storage.has(id);
  }

  public get(id: TId) {
    return this.storage.get(id);
  }

  public getAll(): Readonly<TItem>[] {
    return Object.values(this.storage.getAll());
  }

  public count() {
    return this.storage.count();
  }

  public put(items: Readonly<TItem> | Readonly<TItem>[]) {
    if (Array.isArray(items)) {
      this.storage.batchChanges(() => {
        items.forEach((item) => this.storage.put(this.getId(item), item));
      });
    } else {
      this.storage.put(this.getId(items), items);
    }
  }

  public change(id: TId, itemUpdate: Readonly<Partial<TItem>>) {
    this.storage.change(id, itemUpdate);
  }

  public remove(id: TId) {
    this.storage.remove(id);
  }

  public replaceAll(items: Readonly<TItem>[]) {
    this.storage.replaceAll(this.itemsToObject(items));
  }

  public watchItem(id: TId, onChange: ItemWatcher<TItem>) {
    return this.storage.watchItem(id, onChange);
  }

  /**
   * This subject can be subscribed on directly without memory leaks concerns.
   */
  public useItemBehaviorSubject(base: Node, id: TId) {
    return this.storage.useItemBehaviorSubject(base, id);
  }

  public batchChanges(run: () => void) {
    this.storage.batchChanges(run);
  }

  protected itemsToObject(items: Readonly<TItem>[]) {
    const itemsObject = {} as Record<TId, Readonly<TItem>>;

    items.forEach((item) => {
      itemsObject[this.getId(item)] = item;
    });

    return itemsObject;
  }
}
