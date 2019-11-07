import { Child } from './types';
import { Mutatable } from './mutation';
import { el } from './dom';

/**
 * Transforms ES tagged litterals to className
 */
function literalsToClassname(strings: string[], ...values: unknown[]): string {
  return `${strings[0].slice(1).split('.').join(' ')}${['', ...values].join(' ')}`;
}

/**
 * Transforms function arguments to props and childrens
 */
function argsToPropsAndChildren(...args: unknown[]): [Record<string, unknown>, Child[]] {
  let props: Record<string, unknown> = {};
  let children: Child[] = [];

  if (args.length > 0) {
    if (args[0] !== null && typeof args[0] === 'object' && !(args[0] instanceof Mutatable) && !(args[0] instanceof HTMLElement)) {
      props = args[0] as Record<string, unknown>;
      children = children.concat(args.slice(1) as Child[]);
    } else {
      children = children.concat(args as Child[]);
    }
  }

  return [props, children];
}

/**
 * Wrapper for calling with props or calling with children
 *
 * Usage examples:
 * - div(...children)
 * - div({ props }, ...chidren)
 */
interface ElementFactoryGenericI<T> {
  (): T;
  (...children: Child[]): T;
  (props: Record<string, unknown>, ...children: Child[]): T;
}

/**
 * DOM element factory for tag
 *
 * Usage example:
 * - div = ElementFactoryCommon<HTMLDivElement>('div', { className: 'string' })
 *
 * @param tag Tag name
 */
export function ElementFactoryGeneric<T>(tag: string, props?: Record<string, unknown>): ElementFactoryGenericI<T> {
  return (...args: unknown[]) => {
    const [extendedProps, children] = argsToPropsAndChildren(...args);
    return el<T>(tag, { ...props, ...extendedProps }, children);
  };
}

/**
 * Wrapper for tagged literals, calling with props or calling with children
 */
interface TemplatedResolverI<T> {
  (...children: Child[]): T;
  (props: Record<string, unknown>, ...children: Child[]): T;
  (literals: TemplateStringsArray, ...placeholders: unknown[]): ElementFactoryGenericI<T>;
}

function TemplatedResolver<T>(...children: Child[]): T;
function TemplatedResolver<T>(props: Record<string, unknown>, ...children: Child[]): T;
function TemplatedResolver<T>(literals: TemplateStringsArray, ...placeholders: unknown[]): ElementFactoryGenericI<T>;
function TemplatedResolver<T>(this: string, ...args: unknown[]) {
  // Called as Template Litteral
  if (args.length > 0 && args[0] !== null && typeof args[0] === 'object' && args[0].raw && Array.isArray(args[0])) {
    const className = literalsToClassname(args[0] as string[], ...args.slice(1));
    return ElementFactoryGeneric<T>(this.toString(), { className });
  }

  // Called without Template Litteral
  const [props, children] = argsToPropsAndChildren(...args);
  return el<T>(this.toString(), props, children);
}

/**
 * Tagged DOM element factory
 *
 * Usage example:
 * var div = ElementFactory<HTMLDivElement>('div')
 * - div(...children)
 * - div({ props }, ...chidren)
 * - div`.class`(...chidren)
 * - div`.class`({ props }, ...chidren)
 *
 * @param tag Tag name
 */
export function ElementFactory<T>(tag: string) {
  // To Do: bind without type casting
  return TemplatedResolver.bind(tag) as TemplatedResolverI<T>;
}
