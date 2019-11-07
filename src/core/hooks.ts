interface LifecycleListeners {
  mount?: Array<() => void>;
  unmount?: Array<() => void>;
}

interface Hooks {
  interface?: unknown;
  lifecycle?: LifecycleListeners;
}

interface WithHooks<T extends Hooks = Hooks> {
  __hooks: T;
}

export type WithInterfaceHook<TInterface> = WithHooks<{
  interface: TInterface;
}>;

export type WithLifecycleHook = WithHooks<{
  lifecycle: LifecycleListeners;
}>;

type OnMount = () => OnUnmount;
type OnUnmount = () => void;

function isWithHooks(base: unknown): base is WithHooks {
  return !!(base as { __hooks?: unknown }).__hooks;
}

function ensureWithHooks<T>(base: T): T & WithHooks {
  return isWithHooks(base)
    ? base
    : Object.assign(base, { __hooks: {} });
}

/**
 * Attaches an object for a custom methods and properties
 *
 * @example
 * const elementWithInterface = useInterface(element, {
 *   foo() {},
 * });
 * getInterface(elementWithInterface).foo();
 */
export function useInterface<TBase, TInterface>(base: TBase, object: TInterface) {
  const enhanced = ensureWithHooks(base);
  enhanced.__hooks.interface = object;
  return enhanced as TBase & WithInterfaceHook<TInterface>;
}

/**
 * Gets the attached object (see useInterface)
 */
export function getInterface<TBase extends WithInterfaceHook<any>>(base: TBase)
  : TBase extends WithInterfaceHook<infer TInterface> ? TInterface : never {
  return base.__hooks.interface;
}

/**
 * Attaches mount and unmount event listeners to an element.
 * They should be triggered manually.
 *
 * @example
 * useLifecycle(element, () => {
 *   const intervalId = setInterval(() => console.log('tick'), 1000);
 *   return () => clearInterval(intervalId);
 * });
 * triggerMount(element);
 * triggerUnmount(element);
 */
export function useLifecycle<TBase>(
  base: TBase,
  onMount: OnMount,
) {
  const enhanced = ensureWithHooks(base);
  const lifecycle = enhanced.__hooks.lifecycle || {};
  enhanced.__hooks.lifecycle = lifecycle;
  lifecycle.mount = lifecycle.mount || [];

  lifecycle.mount.push(() => {
    const onUnmount = onMount();
    const handleUnmount = () => {
      try {
        onUnmount();
      } finally {
        if (lifecycle.unmount) {
          const listenerIndex = lifecycle.unmount.indexOf(handleUnmount);
          if (listenerIndex > -1) {
            lifecycle.unmount.splice(listenerIndex, 1);
          }
        }
      }
    };
    lifecycle.unmount = lifecycle.unmount || [];
    lifecycle.unmount.push(handleUnmount);
  });

  return enhanced as TBase & WithLifecycleHook;
}

/**
 * Triggers the mount event listeners on the value (does nothing if there are no listeners)
 */
export function triggerMount(base: unknown) {
  if (isWithHooks(base) && base.__hooks.lifecycle && base.__hooks.lifecycle.mount) {
    [...base.__hooks.lifecycle.mount].forEach((onMount) => onMount());
  }
}

/**
 * Triggers the unmount event listeners on the value (does nothing if there are no listeners)
 */
export function triggerUnmount(base: unknown) {
  if (isWithHooks(base) && base.__hooks.lifecycle && base.__hooks.lifecycle.unmount) {
    [...base.__hooks.lifecycle.unmount].forEach((onUnmount) => onUnmount());
  }
}
