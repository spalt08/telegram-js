/* eslint-disable no-param-reassign */

/*
 * Tools for one parts of the application to communicate with others though DOM nodes.
 *
 * Warning! These lifecycle hooks work only when you use `mount` and `unmount` functions instead of manual DOM attaching/detaching.
 */

import { BehaviorSubject, Observable } from 'rxjs';
import { listen, unlisten } from './dom'; // eslint-disable-line import/no-cycle
import { MaybeObservable } from './types';

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

function ensureWithHooks<T>(base: T) {
  if (isWithHooks(base)) {
    return base;
  }
  (base as T & WithHooks).__hooks = {};
  return base as T & WithHooks;
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
 * Checks attached interface
 */
export function hasInterface<T = unknown>(base: unknown): base is WithInterfaceHook<T> {
  return isWithHooks(base) && !!base.__hooks.interface;
}

/**
 * Attaches a mount event listener to an element.
 * It should be triggered manually.
 *
 * @example
 * let intervalId = 0;
 * const unsubscribe = useOnMount(element, () => {
 *   intervalId = setInterval(() => console.log('tick'), 1000);
 * });
 *
 * // In the real app this function is called by the `mount` and `unmount` functions
 * triggerMount(element);
 */
export function useOnMount(base: unknown, onMount: () => void): () => void {
  const enhanced = ensureWithHooks(base);
  const lifecycle = enhanced.__hooks.lifecycle || {};
  enhanced.__hooks.lifecycle = lifecycle;
  lifecycle.mount = lifecycle.mount || [];
  lifecycle.mount.push(onMount);

  return () => {
    const mounts = enhanced.__hooks.lifecycle && enhanced.__hooks.lifecycle.unmount;
    if (mounts) {
      const listenerIndex = mounts.indexOf(onMount);
      if (listenerIndex > -1) {
        mounts.splice(listenerIndex, 1);
      }
    }
  };
}

/**
 * Attaches an unmount event listener to an element.
 * It should be triggered manually.
 *
 * @example
 * // ...
 * const unsubscribe = useOnMount(element, () => {
 *   clearInterval(intervalId);
 * });
 *
 * // In the real app this function is called by the `unmount` functions
 * triggerUnmount(element);
 */
export function useOnUnmount(base: unknown, onUnmount: () => void): () => void {
  const enhanced = ensureWithHooks(base);
  const lifecycle = enhanced.__hooks.lifecycle || {};
  enhanced.__hooks.lifecycle = lifecycle;
  lifecycle.unmount = lifecycle.unmount || [];
  lifecycle.unmount.push(onUnmount);

  return () => {
    const unmounts = enhanced.__hooks.lifecycle && enhanced.__hooks.lifecycle.unmount;
    if (unmounts) {
      const listenerIndex = unmounts.indexOf(onUnmount);
      if (listenerIndex > -1) {
        unmounts.splice(listenerIndex, 1);
      }
    }
  };
}

/**
 * Triggers the mount event listeners on the element (does nothing if there are no listeners or it's already mounted)
 */
export function triggerMount(base: unknown) {
  if (isWithHooks(base) && base.__hooks.lifecycle && base.__hooks.lifecycle.mount && !base.__hooks.lifecycle.isMountTriggered) {
    base.__hooks.lifecycle.isMountTriggered = true;
    [...base.__hooks.lifecycle.mount].forEach((onMount) => onMount());
  }
}

/**
 * Triggers the unmount event listeners on the element (does nothing if there are no listeners or it's already unmounted)
 */
export function triggerUnmount(base: unknown) {
  if (isWithHooks(base) && base.__hooks.lifecycle && base.__hooks.lifecycle.unmount && base.__hooks.lifecycle.isMountTriggered) {
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
 * Call `unsubscribe` to trigger the unmount handler immediately (if the element is mounted) and stop watching for mounting.
 *
 * @example
 * const stop = useWhileMounted(element, () => {
 *   const intervalId = setInterval(() => console.log('tick'), 1000);
 *   return () => clearInterval(intervalId); // Return an unmount listener
 * });
 */
export function useWhileMounted(base: unknown, onMount: () => () => void): () => void {
  let onUnmount: (() => void) | undefined;

  function handleMount() {
    onUnmount = onMount();
  }

  function handleUnmount() {
    if (onUnmount) {
      onUnmount();
      onUnmount = undefined;
    }
  }

  const stopWatchMount = useOnMount(base, handleMount);
  const stopWatchUnmount = useOnUnmount(base, handleUnmount);

  if (isMountTriggered(base)) {
    handleMount();
  }

  return () => {
    stopWatchMount();
    stopWatchUnmount();
    handleUnmount();
  };
}

/**
 * Attaches an event listener during the element is mounted.
 * Use it to attach event listener to an object outside the element.
 *
 * @example
 * const stop = useListenWhileMounted(element, window, 'resize', () => {
 *   console.log('Window resized');
 * });
 */
export function useListenWhileMounted<K extends keyof HTMLElementEventMap>(base: unknown, target: HTMLElement, event: K, cb: (event: HTMLElementEventMap[K]) => void): () => void; // eslint-disable-line max-len
export function useListenWhileMounted<K extends keyof SVGElementEventMap>(base: unknown, target: SVGElement, event: K, cb: (event: SVGElementEventMap[K]) => void): () => void; // eslint-disable-line max-len
export function useListenWhileMounted(base: unknown, target: EventTarget, event: string, cb: (event: Event) => void): () => void;
export function useListenWhileMounted(base: unknown, target: EventTarget, event: string, cb: (event: Event) => void) {
  return useWhileMounted(base, () => {
    listen(target, event, cb);
    return () => unlisten(target, event, cb);
  });
}

/**
 * Listens to the Observable data change during the element is mounted.
 * Call `stop` to unsubscribe from the observable immediately and stop watching the mount events.
 *
 * @example
 * const stop = useObservable(element, observable, (event) => {
 *   element.foo = event;
 * });
 */
export function useObservable<T>(base: unknown, observable: Observable<T>, onChange: (newValue: T) => void) {
  return useWhileMounted(base, () => {
    const subscription = observable.subscribe(onChange);
    return () => subscription.unsubscribe();
  });
}

/**
 * Listens to the MaybeObservable value change during the element is mounted
 */
export function useMaybeObservable<T>(base: unknown, value: MaybeObservable<T>, onChange: (newValue: T) => void): () => void {
  if (value instanceof Observable) {
    return useObservable(base, value, onChange);
  }

  onChange(value);
  return () => {};
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

/**
 * Converts a MaybeObservable value to BehaviorSubject (that stores the most recent emitted value).
 * The value is updated while the element is mounted.
 *
 * @link https://stackoverflow.com/a/58834889/1118709 Explanation
 */
export function useToBehaviorSubject<T>(base: unknown, observable: MaybeObservable<T>, initial: T): [BehaviorSubject<T>, () => void] {
  if (observable instanceof BehaviorSubject) {
    return [observable, () => {}];
  }

  if (observable instanceof Observable) {
    const subject = new BehaviorSubject(initial);
    const stop = useWhileMounted(base, () => {
      const subscription = observable.subscribe(subject);
      return () => subscription.unsubscribe();
    });
    return [subject, stop];
  }

  return [new BehaviorSubject(initial), () => {}];
}
