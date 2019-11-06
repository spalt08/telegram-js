// @flow

export default class Subscribable {
  receivers: Array<(any) => any>;

  constructor() {
    this.receivers = [];
  }

  subscribe = (receiver: (any) => any) => {
    this.receivers.push(receiver);
    if (this.didSubscribe) this.didSubscribe(receiver);
  }

  unsubscribe = (receiver: (any) => any) => {
    const index = this.receivers.indexOf(receiver);

    if (index > -1) {
      this.receivers.splice(index);
    }
  }

  broadcast = (data: any) => {
    for (let i = 0; i < this.receivers.length; i++) {
      this.receivers[i](data);
    }
  }
}
