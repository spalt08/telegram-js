export type Receiver<T> = (val: T) => any;

/**
 * Helper class for emitting RAM cache updates
 */
export default class CacheEventEmitter<T> {
  receivers: Record<string, Receiver<T>[]> = {};

  /**
   * Saves listener function by repo and key
   */
  subscribe(repo: string, key: string | number, receiver: Receiver<T>) {
    const event = `${repo}.${key}`;

    if (!this.receivers[event]) this.receivers[event] = [];

    this.receivers[event].push(receiver);
  }

  /**
   * Removes specific listener function or all listeners by repo and key
   */
  unsubscribe(repo: string, key: string | number, receiver?: Receiver<T>) {
    const event = `${repo}.${key}`;

    if (!this.receivers[event]) return;

    if (receiver) {
      const index = this.receivers[event].indexOf(receiver);
      if (index > -1) this.receivers[event].splice(index, 1);
    } else {
      this.receivers[event] = [];
    }

    if (this.receivers[event].length === 0) delete this.receivers[event];
  }

  /**
   * Calls all listener functions by repo and key
   */
  broadcast(repo: string, key: string | number, data: T) {
    const eventName = `${repo}.${key}`;
    const receivers = this.receivers[eventName];

    if (!receivers || receivers.length === 0) return;

    for (let i = 0; i < receivers.length; i += 1) {
      receivers[i](data);
    }
  }
}
