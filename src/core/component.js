// @flow

import { Mutatable } from './mutation';

// eslint-disable-next-line no-use-before-define
type Children = Mutatable<any> | Component<any> | string | number;

/**
 * Base HTML Dom component wrapper
 */
export default class Component<T> {
  ref: T;

  children: Array<Children>;

  constructor(tag?: string, props?: Object = {}, children?: Array<Children> = []) {
    if (tag) this.ref = document.createElement(tag);

    // Props
    if (props.className) this.ref.className = props.className;
    if (props.src) this.ref.src = props.src;

    // Children
    this.children = [];

    for (let i = 0; i < children.length; i++) {
      const Child = children[i];

      if (typeof Child === 'function') {
        this.children.push(new Child());
      } else {
        this.children.push(Child);
      }
    }
  }

  mount(parent?: HTMLElement): T {
    if (parent && this.ref) parent.appendChild(this.ref);

    if (this.children.length > 0) {
      for (let i = 0; i < this.children.length; i++) {
        const child = this.children[i];

        if (typeof child === 'number' || typeof child === 'string') {
          this.ref.appendChild(document.createTextNode(child));
          continue;
        }

        if (child instanceof Mutatable) {
          const node = document.createTextNode(child.value);

          child.subscribe((value) => { node.textContent = value; });

          this.ref.appendChild(node);
          continue;
        }

        if (child instanceof Component) {
          child.mount(this.ref);
        }
      }
    }

    if (this.didMount) this.didMount();

    return this;
  }

  unMount() {
    if (this.ref) this.ref.remove();
  }
}
