import { mount, unmount, el } from './dom';
import { Child, ComponentInterface } from './types';

/**
 * Base HTML Dom component wrapper
 */
export default class Component<T extends HTMLElement> implements ComponentInterface<T> {
  ref: T | undefined;

  constructor(tag: string = '', props: Record<string, any> = {}, children: Child[] = []) {
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
