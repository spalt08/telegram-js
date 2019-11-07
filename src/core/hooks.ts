/* eslint-disable no-param-reassign */

/*
 * Tools for one parts of the application to communicate with others though DOM nodes
 */

interface LifecycleListeners {
  mount?: Array<() => void>;
  unmount?: Array<() => void>;
  isMountTriggered?: boolean;
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

type OnMount = () => OnUnmount | void;
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
 * Attaches mount and optional unmount event listeners to an element.
 * They should be triggered manually.
 *
 * @example
 * useOnMount(element, () => {
 *   const intervalId = setInterval(() => console.log('tick'), 1000);
 *   return () => clearInterval(intervalId); // Optionally return an unmount listener
 * });
 *
 * // In the real app these function are called by the `mount` and `unmount` functions
 * triggerMount(element);
 * triggerUnmount(element);
 */
export function useOnMount<TBase>(base: TBase, onMount: OnMount) {
  const enhanced = ensureWithHooks(base);
  const lifecycle = enhanced.__hooks.lifecycle || {};
  enhanced.__hooks.lifecycle = lifecycle;
  lifecycle.mount = lifecycle.mount || [];

  lifecycle.mount.push(() => {
    const onUnmount = onMount();
    if (!onUnmount) {
      return;
    }

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
    useOnUnmount(enhanced, handleUnmount); // eslint-disable-line @typescript-eslint/no-use-before-define
  });

  return enhanced as TBase & WithLifecycleHook;
}

/**
 * Attaches an unmount event listener to an element.
 * It should be triggered manually.
 *
 * @example
 * useOnUnmount(element, () => {
 *   window.removeEventListener(...);
 * });
 *
 * // In the real app this function is called by the `unmount` functions
 * triggerUnmount(element);
 */
export function useOnUnmount<TBase>(base: TBase, onUnmount: OnUnmount) {
  const enhanced = ensureWithHooks(base);
  const lifecycle = enhanced.__hooks.lifecycle || {};
  enhanced.__hooks.lifecycle = lifecycle;
  lifecycle.unmount = lifecycle.unmount || [];
  lifecycle.unmount.push(onUnmount);
  return enhanced as TBase & WithLifecycleHook;
}

/**
 * Checks if the element is in the mounted hook state (the last triggered event from mount/unmount was mount).
 * Undefined means not subscribed or never mounted before.
 */
export function isMountTriggered(base: unknown): boolean | undefined {
  if (!isWithHooks(base)) {
    return undefined;
  }
  return base.__hooks.lifecycle && base.__hooks.lifecycle.isMountTriggered;
}

/**
 * Triggers the mount event listeners on the value (does nothing if there are no listeners or it's already mounted)
 */
export function triggerMount(base: unknown) {
  if (isWithHooks(base) && base.__hooks.lifecycle && base.__hooks.lifecycle.mount && !isMountTriggered(base)) {
    console.log('Mount (hook)', base); // todo: For test, remove later
    base.__hooks.lifecycle.isMountTriggered = true;
    [...base.__hooks.lifecycle.mount].forEach((onMount) => onMount());
  }
}

/**
 * Triggers the unmount event listeners on the value (does nothing if there are no listeners or it's already unmounted)
 */
export function triggerUnmount(base: unknown) {
  if (isWithHooks(base) && base.__hooks.lifecycle && base.__hooks.lifecycle.unmount && isMountTriggered(base)) {
    console.log('Unmount (hook)', base); // todo: For test, remove later
    base.__hooks.lifecycle.isMountTriggered = false;
    [...base.__hooks.lifecycle.unmount].forEach((onUnmount) => onUnmount());
  }
}
