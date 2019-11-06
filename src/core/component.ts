import { mount, unmount, el, Child } from './dom';

/**
 * Base HTML Dom component wrapper
 */
export default class Component<T extends HTMLElement> {
  ref: T | undefined;

  constructor(tag?: string, props: Object = {}, children: Child[] = []) {
    if (tag) {
      this.ref = el<T>(tag, props, children);
    }
  }

  mountTo(parent?: Node) {
    if (parent && this.ref) {
      mount(parent, this.ref);
      if (this.didMount) this.didMount();
    }
  }

  didMount() {}

  unMount() {
    if (this.ref) {
      unmount(this.ref);
    }
  }
}
