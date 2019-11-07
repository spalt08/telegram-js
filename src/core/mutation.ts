import Subscribable, { Receiver } from './emitter';

export type MaybeMutatable<T> = T | Mutatable<T>;

/**
 * Wrapper for any mutatable data.
 * Helps implement rerenders and other stuff.
 *
 * @example
 * const isConnected = new Mutatable<boolean(false);
 *
 * isConnected.subscribe(newValue => alert('Connected!'))
 *
 * isConnected.update(true)
 */
export class Mutatable<T> extends Subscribable<T> {
  protected _value: T;

  constructor(initialValue: T) {
    super();

    this._value = initialValue;
  }

  update = (value: T) => {
    this._value = value;
    this.broadcast(value);
  };

  /**
   * Emits single update event after subscription
   */
  subscribe(receiver: Receiver<T>) {
    super.subscribe(receiver);
    receiver(this._value);
  }

  valueOf(): T {
    return this._value;
  }

  get value(): T {
    return this._value;
  }

  set value(value: T) {
    this.update(value);
  }
}

export function makeMutation<T>(initialValue: T): Mutatable<T> {
  return new Mutatable<T>(initialValue);
}

/**
 * Inherit Mutatable from another Mutatable
 */
export function mutateProperty<T>(from: Mutatable<Record<string, T>>, propName: string) {
  const newMutatable = new Mutatable<T>(from.value[propName]);

  from.subscribe((data: Record<string, T>) => newMutatable.update(data[propName]));

  return newMutatable;
}
