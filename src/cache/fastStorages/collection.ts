import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import Dictionary, { ItemWatcher } from './dictionary';

export type GetId<TItem, TId extends keyof any> = (item: Readonly<TItem>) => TId;

type IndicesConstructors<TItem, TIndices extends Record<keyof any, any>, TId extends keyof any> = {
  [K in keyof TIndices]: (collection: Collection<TItem, TIndices, TId>) => TIndices[K];
};

interface Options<TItem, TIndices extends Record<keyof any, any>, TId extends keyof any> {
  getId: GetId<TItem, TId>;
  considerMin?: boolean;
  indices?: IndicesConstructors<TItem, TIndices, TId>;
  data?: Readonly<TItem>[];
}

export function makeGetKeyFromProp<
  TIdProp extends keyof any,
  TItem extends Record<TIdProp, keyof any>
>(prop: TIdProp): GetId<TItem, TItem[TIdProp]> {
  return (item) => item[prop];
}

export default class Collection<TItem, TIndices extends Record<keyof any, any>, TId extends keyof any = keyof any> {
  public getId: GetId<TItem, TId>;

  public readonly changes: Observable<['add' | 'update' | 'remove', Readonly<TItem>]>;

  public readonly indices = {} as TIndices;

  protected readonly storage: Dictionary<keyof any, TItem>;

  constructor({
    getId,
    considerMin,
    indices = {} as IndicesConstructors<TItem, TIndices, TId>,
    data = [],
  }: Options<TItem, TIndices, TId>) {
    this.storage = new Dictionary(considerMin);
    this.getId = getId;
    this.put(data);
    this.changes = this.storage.changeSubject.pipe(map(([action, _key, item]) => [action, item]));

    // Attach indices
    (Object.keys(indices) as Array<keyof TIndices>).forEach((key) => {
      this.indices[key] = indices[key](this);
    });
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
      items.forEach((item) => this.storage.put(this.getId(item), item));
    } else {
      this.storage.put(this.getId(items), items);
    }
  }

  public remove(id: TId) {
    this.storage.remove(id);
  }

  public replaceAll(items: Readonly<TItem>[]) {
    const itemsObject = {} as Record<keyof any, Readonly<TItem>>;

    items.forEach((item) => {
      itemsObject[this.getId(item)] = item;
    });

    this.storage.replaceAll(itemsObject);
  }

  public watchItem(id: TId, onChange: ItemWatcher<TItem>) {
    return this.storage.watchItem(id, onChange);
  }

  public useWatchItem(base: unknown, id: TId, notifyOnStartWatching: boolean, onChange: ItemWatcher<TItem>) {
    return this.storage.useWatchItem(base, id, notifyOnStartWatching, onChange);
  }

  public useItemBehaviorSubject(base: unknown, id: TId) {
    return this.storage.useItemBehaviorSubject(base, id);
  }
}
