// @flow

import Subscribable from './emitter';

export class Mutatable<T> extends Subscribable {
  _value: T;

  constructor(initialValue: T) {
    super();

    this._value = initialValue;
  }

  update = (value: T) => {
    this._value = value;
    this.broadcast(value);
  }

  use(propName: string): Mutatable<any> {
    if (typeof this._value !== 'object') throw new Error('Cannot use propery of non-object for mutation');

    const mutation = new Mutatable<any>((this._value[propName]: any));
    this.subscribe((data: T) => mutation.update(data[propName]));

    return mutation;
  }

  didSubscribe = (receiver: (any) => any) => {
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
