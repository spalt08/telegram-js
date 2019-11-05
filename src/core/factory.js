// @flow

import Component from './component';
import { Mutatable } from './mutation';

function literalsToProps(strings: Array<string>, ...values: Array<string>): string {
  const className = strings[0].slice(1).split('.');
  return (values && values[0]) ? className.concat(values).join(' ') : className.join(' ');
}

export default function ComponentFactory(tag: string) {
  return function ComponentFactoryWithTag(...args) {
    // Called as constructor
    // new div();
    if (this instanceof ComponentFactoryWithTag) {
      return new Component(tag);
    }

    // Called as Template Litteral
    // div`class="button"`
    if (args[0] && args[0].raw && Array.isArray(args[0])) {
      const className = literalsToProps(args[0], args.length > 1 ? args[1] : undefined);

      return function ChildrenFactory(...propsOrChildren) {
        if (propsOrChildren.length === 1 && typeof propsOrChildren[0] === 'object' && !(propsOrChildren[0] instanceof Mutatable)) {
          return () => new Component(tag, { className, ...propsOrChildren[0] });
        }

        if (this instanceof ChildrenFactory) return new Component(tag, { className });

        return () => new Component(tag, { className }, propsOrChildren);
      };
    }

    // Called With Props
    // div({ props })
    if (args.length === 1 && typeof args[0] === 'object' && !(args[0] instanceof Mutatable)) {
      const props = args[0];

      return function ChildrenFactory(...children) {
        if (this instanceof ChildrenFactory) return new Component(tag, props);
        return () => new Component(tag, props, children);
      };
    }

    return () => new Component(tag, {}, args);
  };
}
