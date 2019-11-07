export type Receiver<T> = (value: T) => void;

/**
 * Absctact class for subscribing to anything
 */
export default class Subscribable<T> {
  protected receivers: Receiver<T>[] = [];

  subscribe(receiver: Receiver<T>) {
    this.receivers.push(receiver);
  }

  unsubscribe(receiver: Receiver<T>) {
    const index = this.receivers.indexOf(receiver);

    if (index > -1) {
      this.receivers.splice(index);
    }
  }

  broadcast(data: T) {
    const protectedReceivers = [...this.receivers];
    for (let i = 0; i < protectedReceivers.length; i++) {
      protectedReceivers[i](data);
    }
  }
}
