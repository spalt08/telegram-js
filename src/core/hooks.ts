/* eslint-disable no-param-reassign */

/*
 * Tools for one parts of the application to communicate with others though DOM nodes.
 *
 * Warning! These lifecycle hooks work only when you use `mount` and `unmount` functions instead of manual DOM attaching/detaching.
 */

import { MaybeMutatable, Mutatable } from './mutation';
import { listen, unlisten } from './dom'; // eslint-disable-line import/no-cycle

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
 * // Important to return the result to tell TS that the element has an interface with specific type
 * return useInterface(element, {
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
 * Attaches a mount event listener to an element.
 * It should be triggered manually.
 *
 * @example
 * let intervalId = 0;
 * useOnMount(element, () => {
 *   intervalId = setInterval(() => console.log('tick'), 1000);
 * });
 *
 * // In the real app this function is called by the `mount` and `unmount` functions
 * triggerMount(element);
 */
export function useOnMount<TBase>(base: TBase, onMount: () => void) {
  const enhanced = ensureWithHooks(base);
  const lifecycle = enhanced.__hooks.lifecycle || {};
  enhanced.__hooks.lifecycle = lifecycle;
  lifecycle.mount = lifecycle.mount || [];
  lifecycle.mount.push(onMount);
  return enhanced as TBase & WithLifecycleHook;
}

/**
 * Attaches an unmount event listener to an element.
 * It should be triggered manually.
 *
 * @example
 * // ...
 * useOnMount(element, () => {
 *   clearInterval(intervalId);
 * });
 *
 * // In the real app this function is called by the `unmount` functions
 * triggerUnmount(element);
 */
export function useOnUnmount<TBase>(base: TBase, onUnmount: () => void) {
  const enhanced = ensureWithHooks(base);
  const lifecycle = enhanced.__hooks.lifecycle || {};
  enhanced.__hooks.lifecycle = lifecycle;
  lifecycle.unmount = lifecycle.unmount || [];
  lifecycle.unmount.push(onUnmount);
  return enhanced as TBase & WithLifecycleHook;
}

/**
 * Removes the listener added by useOnMount
 */
export function unuseOnMount(base: unknown, onMount: () => void) {
  const mounts = isWithHooks(base) && base.__hooks.lifecycle && base.__hooks.lifecycle.unmount;
  if (mounts) {
    const listenerIndex = mounts.indexOf(onMount);
    if (listenerIndex > -1) {
      mounts.splice(listenerIndex, 1);
    }
  }
}

/**
 * Removes the listener added by useOnUnmount
 */
export function unuseOnOnmount(base: unknown, onUnmount: () => void) {
  const unmounts = isWithHooks(base) && base.__hooks.lifecycle && base.__hooks.lifecycle.unmount;
  if (unmounts) {
    const listenerIndex = unmounts.indexOf(onUnmount);
    if (listenerIndex > -1) {
      unmounts.splice(listenerIndex, 1);
    }
  }
}

/**
 * Triggers the mount event listeners on the element (does nothing if there are no listeners or it's already mounted)
 */
export function triggerMount(base: unknown) {
  if (isWithHooks(base) && base.__hooks.lifecycle && base.__hooks.lifecycle.mount && !base.__hooks.lifecycle.isMountTriggered) {
    console.log('[hook] Mount', base); // todo: For test, remove later
    base.__hooks.lifecycle.isMountTriggered = true;
    [...base.__hooks.lifecycle.mount].forEach((onMount) => onMount());
  }
}

/**
 * Triggers the unmount event listeners on the element (does nothing if there are no listeners or it's already unmounted)
 */
export function triggerUnmount(base: unknown) {
  if (isWithHooks(base) && base.__hooks.lifecycle && base.__hooks.lifecycle.unmount && base.__hooks.lifecycle.isMountTriggered) {
    console.log('[hook] Unmount', base); // todo: For test, remove later
    base.__hooks.lifecycle.isMountTriggered = false;
    [...base.__hooks.lifecycle.unmount].forEach((onUnmount) => onUnmount());
  }
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
 * Calls the function when the element is mounted and the other function when unmounted.
 * In contrast to useOnMount, also calls the function during hooking if the element is mounted.
 *
 * @example
 * useWhileMounted(element, () => {
 *   const intervalId = setInterval(() => console.log('tick'), 1000);
 *   return () => clearInterval(intervalId); // Return an unmount listener
 * });
 */
export function useWhileMounted<TBase>(base: TBase, onMount: () => () => void) {
  const handleMount = () => {
    const onUnmount = onMount();
    const handleUnmount = () => {
      unuseOnOnmount(base, handleUnmount);
      onUnmount();
    };
    useOnUnmount(base, handleUnmount);
  };

  if (isMountTriggered(base)) {
    handleMount();
  }

  return useOnMount(base, handleMount);
}

/**
 * Attaches an event listener during the element is mounted.
 * Use it to attach event listener to an object outside the element.
 *
 * Call it before the element is mounted.
 *
 * @example
 * useListenWhileMounted(element, window, 'resize', () => {
 *   console.log('Window resized');
 * });
 */
// eslint-disable-next-line max-len
export function useListenWhileMounted<T, K extends keyof HTMLElementEventMap>(base: T, target: HTMLElement, event: K, cb: (event: HTMLElementEventMap[K]) => void): T & WithLifecycleHook;
export function useListenWhileMounted<T>(base: T, target: EventTarget, event: string, cb: (event: Event) => void): T & WithLifecycleHook;
export function useListenWhileMounted(base: unknown, target: EventTarget, event: string, cb: (event: Event) => void) {
  return useWhileMounted(base, () => {
    listen(target, event, cb);
    return () => unlisten(target, event, cb);
  });
}

/**
 * Listens to the Mutatable value change during the element is mounted
 *
 * @example
 * useMutable(element, mutableValue, (newValue) => {
 *   element.foo = newValue;
 * });
 */
export function useMutatable<T>(base: unknown, value: Mutatable<T>, onChange: (newValue: T) => void) {
  return useWhileMounted(base, () => {
    value.subscribe(onChange);
    return () => value.unsubscribe(onChange);
  });
}

/**
 * Listens to the MaybeMutatable value change during the element is mounted
 */
export function useMaybeMutatable<T>(base: unknown, value: MaybeMutatable<T>, onChange: (newValue: T) => void) {
  if (value instanceof Mutatable) {
    return useMutatable(base, value, onChange);
  }

  return onChange(value);
}

/**
 * Listens to an event outside the hooked element while it's mounted
 */
export function useOutsideEvent<P extends keyof HTMLElementEventMap>(base: HTMLElement, name: P, cb: (event: HTMLElementEventMap[P]) => void) {
  return useListenWhileMounted(base, window, name, (event: HTMLElementEventMap[P]) => {
    if (!base.contains(event.target as HTMLElement)) {
      cb(event);
    }
  });
}
