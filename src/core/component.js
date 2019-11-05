/* eslint-disable import/no-cycle */
// @flow

import { Mutatable } from './mutation';
import { mount, unmount, el } from './dom';

// eslint-disable-next-line no-use-before-define
type Children = Mutatable<any> | () => Component<any> | string | number;

/**
 * Base HTML Dom component wrapper
 */
export default class Component<T: HTMLElement> {
  ref: T | HTMLElement;

  didMount() {}

  constructor(tag?: string, props?: Object = {}, children?: Array<Children> = []) {
    if (tag) {
      this.ref = el(tag, props, children);
    }
  }

  mountTo(parent?: HTMLElement) {
    if (parent && this.ref) {
      mount(parent, this.ref);
      if (this.didMount) this.didMount();
    }
  }

  unMount() {
    if (this.ref) {
      unmount(this.ref);
    }
  }
}
