import Subscribable, { Receiver } from './emitter';

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

  use(propName: string): Mutatable<any> {
    if (typeof this._value === 'object') {
      const mutation = new Mutatable<any>((this._value as Record<string, any>)[propName]);
      this.subscribe((data: T) => mutation.update((data as Record<string, any>)[propName]));

      return mutation;
    }

    throw new Error('Cannot use propery of non-object for mutation');
  }

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

export function useMutation<T>(initialValue: T): Mutatable<T> {
  return new Mutatable<T>(initialValue);
}

export type MaybeMutatable<T> = T | Mutatable<T>;
