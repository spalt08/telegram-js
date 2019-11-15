import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import Dictionary, { ItemWatcher } from './dictionary';

export type GetId<TItem, TId> = (item: Readonly<TItem>) => Readonly<TId>;

export type SerializeId<TId> = (id: Readonly<TId>) => keyof any;

type IndicesConstructors<TItem, TId, TIndices extends Record<keyof any, any>> = {
  [K in keyof TIndices]: (collection: Collection<TItem, TId, TIndices>) => TIndices[K];
};

interface Options<TItem, TId, TIndices extends Record<keyof any, any>> {
  getId: GetId<TItem, TId>;
  serializeId: SerializeId<TId>;
  considerMin?: boolean;
  indices?: IndicesConstructors<TItem, TId, TIndices>;
  data?: Readonly<TItem>[];
}

export function makeGetIdFromProp<
  TIdProp extends keyof any,
  TItem extends Record<TIdProp, keyof any>
>(prop: TIdProp): GetId<TItem, TItem[TIdProp]> {
  return (item) => item[prop];
}

export function idAsIs<T extends keyof any>(id: T): T {
  return id;
}

export default class Collection<TItem, TId, TIndices extends Record<keyof any, any>> {
  public getId: GetId<TItem, TId>;

  protected serializeId: SerializeId<TId>;

  public readonly changes: Observable<['add' | 'update' | 'remove', Readonly<TItem>]>;

  public readonly indices = {} as TIndices;

  protected readonly storage: Dictionary<keyof any, TItem>;

  constructor({
    getId,
    serializeId,
    considerMin,
    indices = {} as IndicesConstructors<TItem, TId, TIndices>,
    data = [],
  }: Options<TItem, TId, TIndices>) {
    this.storage = new Dictionary(considerMin);
    this.getId = getId;
    this.serializeId = serializeId;
    this.put(data);
    this.changes = this.storage.changeSubject.pipe(map(([action, _key, item]) => [action, item]));

    // Attach indices
    (Object.keys(indices) as Array<keyof TIndices>).forEach((key) => {
      this.indices[key] = indices[key](this);
    });
  }

  public has(id: TId) {
    return this.storage.has(this.serializeId(id));
  }

  public get(id: TId) {
    return this.storage.get(this.serializeId(id));
  }

  public getAll(): Readonly<TItem>[] {
    return Object.values(this.storage.getAll());
  }

  public count() {
    return this.storage.count();
  }

  public put(items: Readonly<TItem> | Readonly<TItem>[]) {
    if (Array.isArray(items)) {
      items.forEach((item) => this.storage.put(this.serializeId(this.getId(item)), item));
    } else {
      this.storage.put(this.serializeId(this.getId(items)), items);
    }
  }

  public remove(id: TId) {
    this.storage.remove(this.serializeId(id));
  }

  public replaceAll(items: Readonly<TItem>[]) {
    const itemsObject = {} as Record<keyof any, Readonly<TItem>>;

    items.forEach((item) => {
      itemsObject[this.serializeId(this.getId(item)) as any] = item;
    });

    this.storage.replaceAll(itemsObject);
  }

  public watchItem(id: TId, onChange: ItemWatcher<TItem>) {
    return this.storage.watchItem(this.serializeId(id), onChange);
  }

  public useWatchItem(base: unknown, id: TId, notifyOnStartWatching: boolean, onChange: ItemWatcher<TItem>) {
    return this.storage.useWatchItem(base, this.serializeId(id), notifyOnStartWatching, onChange);
  }

  public useItemBehaviorSubject(base: unknown, id: TId) {
    return this.storage.useItemBehaviorSubject(base, this.serializeId(id));
  }
}
