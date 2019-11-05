// @flow

import type { ElementOrComponent } from './dom';
import { Mutatable } from './mutation';
import { el } from './dom';

// TO DO: Typing for factory
// type Factory<T> = T | () => T;
// type FactoryTemplated<T> = (strings: Array<string>, ...expr: Array<any>) => FactoryWithChidren<T> | Factory<T>;
// type FactoryWithChidren<T> = (...children: Array<FactoryTemplated<T>>) => Factory<T>;
// declare function ElementFactoryTagged<T>(strings: Array<string>, ...expr: Array<any>): FactoryWithChidren<T> | Factory<T>;

function literalsToClassname(strings: Array<string>, ...values: Array<string>): string {
  return strings[0].slice(1).split('.').concat(values).join(' ');
}

export default function ElementFactory<T>(tag: string): any {
  return function ElementFactoryTagged(...args: Array<any>) {
    // Called as constructor
    // new div();
    if (this instanceof ElementFactoryTagged) {
      return el<T>(tag);
    }

    // Called as Template Litteral
    // div`.class`
    if (args[0] && args[0].raw && Array.isArray(args[0])) {
      const className = literalsToClassname(args[0], ...args.slice(1));

      return function ElementChildrenFactory(...propsOrChildren: Array<Object | ElementOrComponent>) {
        if (propsOrChildren.length === 1 && typeof propsOrChildren[0] === 'object' && !(propsOrChildren[0] instanceof Mutatable)) {
          return () => el<T>(tag, { className, ...propsOrChildren[0] });
        }

        if (this instanceof ElementChildrenFactory) return el<T>(tag, { className });

        return () => el<T>(tag, { className }, propsOrChildren);
      };
    }

    // Called With Props
    // div({ props })
    if (args.length === 1 && typeof args[0] === 'object' && !(args[0] instanceof Mutatable)) {
      const props = args[0];

      return function ElementChildrenFactory(...children: Array<ElementOrComponent>) {
        if (this instanceof ElementChildrenFactory) return el<T>(tag, props);
        return () => el<T>(tag, props, children);
      };
    }

    return () => el<T>(tag, {}, args);
  };
}
