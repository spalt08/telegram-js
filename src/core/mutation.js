// @flow

import Subscribable from './emitter';

export class Mutatable<T> extends Subscribable {
  _value: T;

  constructor(initialValue: T) {
    super();

    this._value = initialValue;
  }

  update(value: T) {
    this._value = value;
    this.broadcast(value);
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
