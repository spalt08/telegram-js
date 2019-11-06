type Receiver<T> = (value: T) => void;

export default class Subscribable<T> {
  receivers: Array<Receiver<T>>;

  constructor() {
    this.receivers = [];
  }

  subscribe = (receiver: Receiver<T>) => {
    this.receivers.push(receiver);
    if (this.didSubscribe) this.didSubscribe(receiver);
  }

  didSubscribe = (receiver: Receiver<T>): void => {};

  unsubscribe = (receiver: Receiver<T>) => {
    const index = this.receivers.indexOf(receiver);

    if (index > -1) {
      this.receivers.splice(index);
    }
  }

  broadcast = (data: T) => {
    for (let i = 0; i < this.receivers.length; i++) {
      this.receivers[i](data);
    }
  }
}
