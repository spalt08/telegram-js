import { Child } from './dom';
import { Mutatable } from './mutation';
import { el } from './dom';

/**
 * Transforms ES tagged litterals to className
 */
function literalsToClassname(strings: Array<string>, ...values: Array<string>): string {
  return strings[0].slice(1).split('.').concat(values).join(' ');
}

/**
 * DOM element factory for tag
 * 
 * Usage example:
 * - div = ElementFactory<HTMLDivElement>('div')
 *
 * @param tag Tag name
 */
export function ElementFactory<T>(tag: string) {
  /**
   * Wrapper for tagged literals, constructor, calling with props or calling with children
   * 
   * Usage examples:
   * - new div()
   * - div`.class`
   * - div({ props })
   * - div(...children)
   */ 
  return function ElementFactoryTagged(...args: Array<any>): any {
    // Called as constructor
    // new div()
    if (this instanceof ElementFactoryTagged) {
      return el<T>(tag, args[0]);
    }

    // Called as Template Litteral
    // div`.class`
    if (args[0] && args[0].raw && Array.isArray(args[0])) {
      const className = literalsToClassname(args[0], ...args.slice(1));

      // One of:
      // - div`.class`({ props })
      // - div`.class`(...children)
      return function ElementPropChildFactory(...propsOrChildren: Array<Object | Child>) {
        // div`.class`({ props })
        if (propsOrChildren.length === 1 && typeof propsOrChildren[0] === 'object' && !(propsOrChildren[0] instanceof Mutatable)) {
          // new div`.class`()
          if (this instanceof ElementPropChildFactory) return el<T>(tag, { className, ...propsOrChildren[0] });

          return function ElementWithPropsChildFactory(...children: Child) {
            if (this instanceof ElementWithPropsChildFactory) return el<T>(tag, { className, ...propsOrChildren[0] }, children);

            // div`class`({ props })(...children)
            if (children.length > 0) {
              return () => el<T>(tag, { className, ...propsOrChildren[0] }, children);
            }

            return el<T>(tag, { className, ...propsOrChildren[0] }, children);
          };
        }

        // new div`.class`()
        if (this instanceof ElementPropChildFactory) return el<T>(tag, { className }, propsOrChildren);

        // div`class`(...children)
        return () => el<T>(tag, { className }, propsOrChildren);
      };
    }

    // Called With Props
    // div({ props })
    if (args.length === 1 && typeof args[0] === 'object' && !(args[0] instanceof Mutatable)) {
      const props = args[0];

      // div({ props })(...children)
      return function ElementChildrenFactory(...children: Array<Child>) {
        // new div({ props })(...children)
        if (this instanceof ElementChildrenFactory) return el<T>(tag, props, children);
        return () => el<T>(tag, props, children);
      };
    }

    // div(...children)
    return () => el<T>(tag, {}, args);
  };
}

// ripple = ComponentFactory<Ripple>;
export function ComponentFactory(Constructor) {
  return function ComponentTaggedFactory(...args) {
    // Called as constructor
    // new ripple()
    if (this instanceof ComponentTaggedFactory) {
      if (args.length === 1 && typeof args[0] === 'object' && !(args[0] instanceof Mutatable)) {
        return new Constructor(args[0]).ref;
      }

      return new Constructor({}, args).ref;
    }

    // Called as Template Litteral
    // ripple`.button`
    if (args[0] && args[0].raw && Array.isArray(args[0])) {
      const className = literalsToClassname(args[0], ...args.slice(1));

      // One of:
      // - ripple`.button`({ props })
      // - ripple`.button`(...children)
      return function ComponentPropChildFactory(...propsOrChildren: Array<Object | Child>) {
        // ripple`.button`({ props })
        if (propsOrChildren.length === 1 && typeof propsOrChildren[0] === 'object' && !(propsOrChildren[0] instanceof Mutatable)) {
          // new ripple`.button`({ props })
          if (this instanceof ComponentPropChildFactory) return new Constructor({ className, ...propsOrChildren[0] }).ref;

          return function ComponentWithPropsChildFactory(...children: Child) {
            if (this instanceof ComponentWithPropsChildFactory) return new Constructor({ className, ...propsOrChildren[0] }, children).ref;

            // ripple`.button`({ props })(...children)
            if (children.length > 0) {
              return () => new Constructor({ className, ...propsOrChildren[0] }, children).ref;
            }

            return new Constructor({ className, ...propsOrChildren[0] }, children).ref;
          };
        }

        // new ripple`.button`(...children)
        if (this instanceof ComponentPropChildFactory) return new Constructor({ className }, propsOrChildren).ref;

        // ripple`.button`(...children)
        return () => new Constructor({ className }, propsOrChildren).ref;
      };
    }

    // Called with props
    // ripple({ disabled: true })
    if (args.length === 1 && typeof args[0] === 'object' && !(args[0] instanceof Mutatable)) {
      const props = args[0];

      // ripple({ props })(...children)
      // ripple({ props })
      return function ComponentChildrenFactory(...children: Array<Child>) {
        if (this instanceof ComponentChildrenFactory) return new Constructor(props, children).ref;
        return () => new Constructor(props, children).ref;
      };
    }
  };
}
