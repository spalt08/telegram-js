import { Child } from './types';
import { Mutatable } from './mutation';
import { el, Component } from './dom';

/**
 * Transforms ES tagged litterals to className
 */
function literalsToClassname(strings: string[], ...values: string[]): string {
  return strings[0].slice(1).split('.').concat(values).join(' ');
}

/**
 * Element Factory Interface
 */

export interface ElementFactoryI<T> {
  (): T;
  new (props: Record<string, any>): T;
  new (...children: Child[]): T;
  (literals: TemplateStringsArray, ...placeholders: string[]): ElementFactoryI<T>;
  (props: Record<string, any>): ElementFactoryI<T>;
  (...children: Child[]): ElementFactoryI<T>;
}

/**
 * DOM element factory for tag
 *
 * Usage example:
 * - div = ElementFactory<HTMLDivElement>('div')
 *
 * @param tag Tag name
 */
export function ElementFactory<T>(tag: string): ElementFactoryI<T> {
  /**
   * Wrapper for tagged literals, constructor, calling with props or calling with children
   *
   * Usage examples:
   * - new div()
   * - div`.class`
   * - div({ props })
   * - div(...children)
   */
  return function ElementFactoryTagged(this: any, ...args: any[]) {
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
      return function ElementPropChildFactory(this: any, ...propsOrChildren: Array<Object | Child>) {
        // div`.class`({ props })
        if (propsOrChildren.length === 1 && typeof propsOrChildren[0] === 'object' && !(propsOrChildren[0] instanceof Mutatable)) {
          // new div`.class`()
          if (this instanceof ElementPropChildFactory) return el<T>(tag, { className, ...propsOrChildren[0] });

          return function ElementWithPropsChildFactory(this: any, ...children: Child[]) {
            const props = typeof propsOrChildren[0] === 'object' ? propsOrChildren[0] : {};

            if (this instanceof ElementWithPropsChildFactory) {
              return el<T>(tag, { className, ...props }, children);
            }

            // div`class`({ props })(...children)
            if (children.length > 0) {
              return () => el<T>(tag, { className, ...props }, children);
            }

            return el<T>(tag, { className, ...props }, children);
          };
        }

        // new div`.class`()
        if (this instanceof ElementPropChildFactory) return el<T>(tag, { className }, propsOrChildren as Child[]);

        // div`class`(...children)
        return () => el<T>(tag, { className }, propsOrChildren as Child[]);
      };
    }

    // Called With Props
    // div({ props })
    if (args.length === 1 && typeof args[0] === 'object' && !(args[0] instanceof Mutatable)) {
      const props = args[0];

      // div({ props })(...children)
      return function ElementChildrenFactory(this: any, ...children: Child[]) {
        // new div({ props })(...children)
        if (this instanceof ElementChildrenFactory) return el<T>(tag, props, children);
        return () => el<T>(tag, props, children);
      };
    }

    // div(...children)
    return () => el<T>(tag, {}, args);
  } as any as ElementFactoryI<T>;
}

interface ConstructorI<T extends HTMLElement> {
  new (props?: Record<string, any>, children?: Child[]): Component<T>,
}

// ripple = ComponentFactory<Ripple>;
export function ComponentFactory<T extends HTMLElement>(Constructor: ConstructorI<T>): ElementFactoryI<T> {
  return function ComponentTaggedFactory(this: any, ...args: any[]) {
    // Called as constructor
    // new ripple()
    if (this instanceof ComponentTaggedFactory) {
      if (args.length === 1 && typeof args[0] === 'object' && !(args[0] instanceof Mutatable)) {
        return new Constructor(args[0]).element;
      }

      return new Constructor({}, args).element;
    }

    // Called as Template Litteral
    // ripple`.button`
    if (args[0] && args[0].raw && Array.isArray(args[0])) {
      const className = literalsToClassname(args[0], ...args.slice(1));

      // One of:
      // - ripple`.button`({ props })
      // - ripple`.button`(...children)
      return function ComponentPropChildFactory(this: any, ...propsOrChildren: Array<Object | Child>) {
        // ripple`.button`({ props })
        if (propsOrChildren.length === 1 && typeof propsOrChildren[0] === 'object' && !(propsOrChildren[0] instanceof Mutatable)) {
          // new ripple`.button`({ props })
          if (this instanceof ComponentPropChildFactory) return new Constructor({ className, ...propsOrChildren[0] }).element;

          return function ComponentWithPropsChildFactory(this: any, ...children: Child[]) {
            const props = typeof propsOrChildren[0] === 'object' ? propsOrChildren[0] : {};

            if (this instanceof ComponentWithPropsChildFactory) return new Constructor({ className, ...props }, children).element;

            // ripple`.button`({ props })(...children)
            if (children.length > 0) {
              return () => new Constructor({ className, ...props }, children).element;
            }

            return new Constructor({ className, ...props }, children).element;
          };
        }

        // new ripple`.button`(...children)
        if (this instanceof ComponentPropChildFactory) return new Constructor({ className }, propsOrChildren as Child[]).element;

        // ripple`.button`(...children)
        return () => new Constructor({ className }, propsOrChildren as Child[]).element;
      };
    }

    // Called with props
    // ripple({ disabled: true })
    if (args.length === 1 && typeof args[0] === 'object' && !(args[0] instanceof Mutatable)) {
      const props = args[0];

      // ripple({ props })(...children)
      // ripple({ props })

      return function ComponentChildrenFactory(this: any, ...children: Child[]) {
        if (this instanceof ComponentChildrenFactory) return new Constructor(props, children).element;
        return () => new Constructor(props, children).element;
      };
    }
  } as ElementFactoryI<T>;
}
