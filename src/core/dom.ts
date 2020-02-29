/* eslint-disable no-param-reassign */
// eslint-disable-next-line import/no-cycle
import { isMountTriggered, triggerMount, triggerUnmount, useMaybeObservable, useOnMount, useOnUnmount } from './hooks';
import { MaybeObservable, MaybeObservableMap, WritableStyles } from './types';

/**
 * Methods for manipulating with DOM.
 * All DOM manipulations should be done with this module.
 */

/**
 * Checks if the node is in the page document
 */
export function isMounted(element: Node): boolean {
  return element.isConnected;
}

function triggerMountRecursive(element: Node) {
  // The parent is triggered as mounted means that the children are triggered too (if they use mount/unmount as expected)
  if (isMountTriggered(element) === true) {
    return;
  }

  try {
    triggerMount(element);
  } catch (error) {
    console.error(error); // eslint-disable-line no-console
  }

  for (let i = 0; i < element.childNodes.length; i++) {
    triggerMountRecursive(element.childNodes[i]);
  }
}

function triggerUnmountRecursive(element: Node) {
  // The parent is triggered as unmounted means that the children are triggered too (if they use mount/unmount as expected)
  if (isMountTriggered(element) === false) {
    return;
  }

  try {
    triggerUnmount(element);
  } catch (error) {
    console.error(error); // eslint-disable-line no-console
  }

  for (let i = 0; i < element.childNodes.length; i++) {
    triggerUnmountRecursive(element.childNodes[i]);
  }
}

/**
 * Attach event listener to element
 */
export function listen<K extends keyof HTMLElementEventMap>(element: HTMLElement, event: K, cb: (event: HTMLElementEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void; // eslint-disable-line max-len
export function listen<K extends keyof SVGElementEventMap>(element: SVGElement, event: K, cb: (event: SVGElementEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void; // eslint-disable-line max-len
export function listen(element: EventTarget, event: string, cb: (event: Event) => void, options?: boolean | AddEventListenerOptions): void;
export function listen(element: EventTarget, event: string, cb: (event: Event) => void, options?: boolean | AddEventListenerOptions) {
  element.addEventListener(event, cb, options);
}

/**
 * Remove event listener from element
 */
export function unlisten<K extends keyof HTMLElementEventMap>(element: HTMLElement, event: K, cb: (event: HTMLElementEventMap[K]) => void): void;
export function unlisten<K extends keyof SVGElementEventMap>(element: SVGElement, event: K, cb: (event: SVGElementEventMap[K]) => void): void;
export function unlisten(element: EventTarget, event: string, cb: (event: Event) => void): void;
export function unlisten(element: EventTarget, event: string, cb: (event: Event) => void) {
  element.removeEventListener(event, cb);
}

/**
 * Attach event listener that fires once to element
 */
export function listenOnce<K extends keyof HTMLElementEventMap>(element: HTMLElement, event: K, cb: (event: HTMLElementEventMap[K]) => void): void;
export function listenOnce<K extends keyof SVGElementEventMap>(element: SVGElement, event: K, cb: (event: SVGElementEventMap[K]) => void): void;
export function listenOnce(element: EventTarget, event: string, cb: (event: Event) => void): void;
export function listenOnce(element: EventTarget, event: string, cb: (event: Event) => void) {
  const handle = (e: Event) => {
    element.removeEventListener(event, handle);
    cb(e);
  };
  element.addEventListener(event, handle);
}

/**
 * Dispatch element event
 */
export function dispatch(element: EventTarget, eventName: string, bubbles = false, cancelable = false) {
  // @link https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Creating_and_triggering_events#The_old-fashioned_wayv
  const event = document.createEvent('Event');
  event.initEvent(eventName, bubbles, cancelable);

  element.dispatchEvent(event);
}

/**
 * Mounts Node to parent Node
 */
export function mount(parent: Node, child: Node, before?: Node) {
  if (before) {
    parent.insertBefore(child, before);
  } else {
    parent.appendChild(child);
  }

  if (isMounted(parent)) {
    triggerMountRecursive(child);
  } else {
    // For a case when the child is remounted to an unmounted parent
    triggerUnmountRecursive(child);
  }
}

/**
 * Unmounts HTMLElement
 */
export function unmount(element: Node) {
  if (element.parentNode) {
    element.parentNode.removeChild(element);
  }

  triggerUnmountRecursive(element);
}

/**
 * Unmounts all children of HTMLElement
 */
export function unmountChildren(element: Node) {
  while (element.firstChild) {
    unmount(element.firstChild);
  }
}

/**
 * Sets any attribute to HTMLElement
 */
export function setAttribute(element: Element, attr: string, value: MaybeObservable<string | undefined>) {
  useMaybeObservable(element, value, (v) => {
    if (v === undefined) {
      element.removeAttribute(attr);
    } else {
      element.setAttribute(attr, v);
    }
  });
}

/**
 * Gets attribute from HTMLElement
 */
export function getAttribute(element: Element, attr: string): string {
  return element.getAttribute(attr) || '';
}

/**
 * Sets class name to HTMLElement
 */
export function setClassName(element: Element, className: MaybeObservable<string | undefined>) {
  useMaybeObservable(element, className, (cn = '') => { element.className = cn; });
}

/**
 * Sets any property to HTMLElement
 */
export function setProperty<T extends Node, K extends keyof T>(element: T, prop: K, value: MaybeObservable<T[K]>) {
  useMaybeObservable(element, value, (v) => { element[prop] = v; });
}

/**
 * Sets style to HTMLElement
 */
export function setStyle(element: HTMLElement | SVGElement, style: Partial<MaybeObservableMap<WritableStyles>>) {
  (Object.keys(style) as Array<keyof WritableStyles>).forEach((prop) => {
    useMaybeObservable(element, style[prop], (value) => {
      element.style[prop] = value;
    });
  });
}

/**
 * Updates value at HTMLElement and disatch input event;x
 */
export function setValue(element: HTMLInputElement, value: MaybeObservable<string>) {
  useMaybeObservable(element, value, (v) => {
    element.value = v;
    dispatch(element, 'input');
  });
}

/**
 * Sets props to an element
 */
export function setElementProps(element: HTMLElement | SVGElement, props: Record<string, any>) {
  const propNames = Object.keys(props);
  for (let i = 0; i < propNames.length; i++) {
    const propName = propNames[i];
    const propValue = props[propName];

    if (propName.slice(0, 2) === 'on') {
      listen(element, propName.slice(2).toLowerCase(), propValue);
      continue;
    }

    switch (propName) {
      case 'style':
        if (propValue !== undefined) {
          setStyle(element, propValue);
        }
        break;

      case 'class':
      case 'className':
        if (element instanceof HTMLElement) {
          setClassName(element, propValue);
        } else {
          setAttribute(element, 'class', propValue);
        }
        break;

      case 'disabled':
      case 'checked':
      case 'selected':
      case 'value':
        setProperty(element as any, propName, propValue);
        break;

      case 'key':
        setAttribute(element, 'data-key', propValue);
        break;

      default:
        setAttribute(element, propName, propValue);
    }
  }
}

/**
 * Creates DOM element and returns it
 */
export function el<T extends keyof HTMLElementTagNameMap>(tag: T, props?: Record<string, any>, children?: Node[]): HTMLElementTagNameMap[T];
export function el(tag: string, props?: Record<string, any>, children?: Node[]): HTMLElement;
export function el(tag: string, props: Record<string, any> = {}, children: Node[] = []): HTMLElement {
  const element = document.createElement(tag);

  // Setting props
  if (props) {
    setElementProps(element, props);
  }

  // Mounting children
  for (let i = 0; i < children.length; i += 1) {
    element.appendChild(children[i]);
  }

  return element;
}

export function createFragment(children: ArrayLike<Node> = []) {
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < children.length; i += 1) {
    fragment.appendChild(children[i]);
  }
  return fragment;
}


export function blurAll(insideElement?: Node) {
  const focusedElement = document.activeElement;
  if (!focusedElement || !(focusedElement instanceof HTMLElement || focusedElement instanceof SVGElement)) {
    return;
  }

  if (insideElement && !insideElement.contains(focusedElement)) {
    return;
  }

  focusedElement.blur();
}

const svgFromCodeTempRoot = document.createElement('div');

/**
 * Makes an <svg /> element from the SVG code
 */
export function svgFromCode(code: string, id?: string, props?: Record<string, any>): SVGSVGElement {
  svgFromCodeTempRoot.innerHTML = id === undefined ? code : code.replace(/\$id\$/g, id);
  const element = svgFromCodeTempRoot.lastElementChild;
  svgFromCodeTempRoot.innerHTML = '';

  if (!(element instanceof SVGSVGElement)) {
    throw new TypeError('The code is not an SVG code');
  }

  if (props) {
    setElementProps(element, props);
  }

  return element;
}

/**
 * Notifies when the element becomes visible/invisible.
 * Also notifies immediately when called.
 */
export function watchVisibility(element: Element, onChange: (isVisible: boolean) => void) {
  if (typeof IntersectionObserver === 'undefined') {
    // A fallback
    const unsubscribeMount = useOnMount(element, () => onChange(true));
    const unsubscribeUnmount = useOnUnmount(element, () => onChange(false));
    onChange(!!isMountTriggered(element));
    return () => {
      unsubscribeMount();
      unsubscribeUnmount();
    };
  }

  let wasVisible: boolean | undefined;
  const handleChange = (entries: IntersectionObserverEntry[]) => {
    const isVisible = entries.length > 0 && entries[0].isIntersecting;
    if (isVisible !== wasVisible) {
      wasVisible = isVisible;
      onChange(isVisible);
    }
  };
  // eslint-disable-next-line compat/compat
  const observer = new IntersectionObserver(handleChange);
  observer.observe(element);

  // Chrome and Firefox don't notify about the visibility in the following synchronous case:
  //  1. Create an element
  //  2. Call this function
  //  3. Mount the element
  // The call below fixes this
  handleChange(observer.takeRecords());

  return () => observer.disconnect();
}
