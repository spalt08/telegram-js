// @flow

/**
 * Base HTML Dom component wrapper
 */
export default class Component<T> {
  ref: T;

  childrenCreators: Array<() => Component>;

  children: Array<Component>;

  constructor(tag: string, props: Object = {}, immutableChildren: Array<Component> = []): Component {
    if (tag) this.ref = document.createElement(tag);

    if (props.className) this.ref.className = props.className;

    this.childrenCreators = immutableChildren;
    this.children = [];
  }

  mount(parent?: HTMLElement): T {
    if (parent && this.ref) parent.appendChild(this.ref);

    if (this.childrenCreators) {
      for (let i = 0; i < this.childrenCreators.length; i++) {
        this.children.push(new this.childrenCreators[i]().mount(this.ref));
      }
    }

    if (this.didMount) this.didMount();

    return this;
  }

  unMount() {
    if (this.ref) this.ref.remove();
  }
}
