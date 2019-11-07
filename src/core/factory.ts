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
function argsToPropsAndChildren(...args: unknown[]): [Record<string, unknown>, Node[]] {
  let props: Record<string, unknown> = {};
  let children: Node[] = [];

  if (args.length > 0) {
    if (!(args[0] instanceof Node)) {
      props = args[0] as Record<string, unknown>;
      children = [...children, ...args.slice(1) as Node[]];
    } else {
      children = [...children, ...args as Node[]];
    }
  }

  return [props, children];
}

/**
 * Wrapper for calling with props or calling with children
 *
 * @example
 * div(...children)
 * div({ props }, ...chidren)
 */
interface ElementFactoryGenericI<T> {
  (): T;
  (...children: Node[]): T;
  (props: Record<string, unknown>, ...children: Node[]): T;
}

/**
 * DOM element factory for tag
 *
 * @example
 * div = ElementFactoryCommon<HTMLDivElement>('div', { className: 'string' })
 */
export function ElementFactoryGeneric<T extends keyof HTMLElementTagNameMap>(
  tag: T,
  props?: Record<string, unknown>,
): ElementFactoryGenericI<HTMLElementTagNameMap[T]>;
export function ElementFactoryGeneric(tag: string, props?: Record<string, unknown>): ElementFactoryGenericI<HTMLElement>;
export function ElementFactoryGeneric(tag: string, props?: Record<string, unknown>): ElementFactoryGenericI<HTMLElement> {
  return (...args: unknown[]) => {
    const [extendedProps, children] = argsToPropsAndChildren(...args);
    return el(tag, { ...props, ...extendedProps }, children);
  };
}

/**
 * Tagged DOM element factory
 *
 * @example
 * var div = ElementFactory('div')
 *
 * div(...children)
 * div({ props }, ...chidren)
 * div`.class`(...chidren)
 * div`.class`({ props }, ...chidren)
 *
 */
export function ElementFactory<T extends keyof HTMLElementTagNameMap>(tag: T) {
  function TemplatedResolver(...children: Node[]): HTMLElementTagNameMap[T];
  function TemplatedResolver(props: Record<string, unknown>, ...children: Node[]): HTMLElementTagNameMap[T];
  function TemplatedResolver(literals: TemplateStringsArray, ...placeholders: unknown[]): ElementFactoryGenericI<HTMLElementTagNameMap[T]>;
  function TemplatedResolver(...args: unknown[]) {
    // Called as Template Litteral
    if (
      args.length > 0
      && args[0] !== null
      && typeof args[0] === 'object'
      && (args[0] as TemplateStringsArray).raw
      && Array.isArray(args[0])
    ) {
      const className = literalsToClassname(args[0] as string[], ...args.slice(1));
      return ElementFactoryGeneric(tag, { className });
    }

    // Called without Template Litteral
    const [props, children] = argsToPropsAndChildren(...args);
    return el(tag, props, children);
  }

  return TemplatedResolver;
}
