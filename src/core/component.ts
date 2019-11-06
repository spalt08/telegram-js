/* eslint-disable import/no-cycle */

import { Mutatable } from './mutation';
import { mount, unmount, el } from './dom';

// eslint-disable-next-line no-use-before-define
type Child = Mutatable<any> | (() => Component<any>) | string | number;

/**
 * Base HTML Dom component wrapper
 */
export default class Component<T extends HTMLElement> {
  ref: T | undefined;

  didMount() {}

  constructor(tag?: string, props: Object = {}, children: Child[] = []) {
    if (tag) {
      this.ref = el(tag, props, children);
    }
  }

  mountTo(parent?: Node) {
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
