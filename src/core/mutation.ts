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
 * Converts values from a mutation to another mutation
 */
export function mapMutatable<T, P>(source: Mutatable<T>, map: (value: T) => P): Mutatable<P> {
  const destination = new Mutatable(map(source.value));
  source.subscribe((value) => destination.update(map(value)));
  return destination;
}

/**
 * Extracts a property from the mutatable object values
 */
export function mutateProperty<T extends object, P extends keyof T>(from: Mutatable<T>, propName: P): Mutatable<T[P]> {
  return mapMutatable(from, (value) => value[propName]);
}

export function getMaybeMutatableValue<T>(source: MaybeMutatable<T>): T {
  return source instanceof Mutatable ? source.value : source;
}
