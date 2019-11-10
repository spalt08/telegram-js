/* eslint-disable no-param-reassign */
import { MaybeMutatable } from './mutation';
// eslint-disable-next-line import/no-cycle
import { isMountTriggered, triggerMount, triggerUnmount, useMaybeMutatable } from './hooks';

/**
 * Methods for manipulating with DOM.
 * All DOM manipulations should be done with this module.
 */

type WritableCSSProps = Exclude<keyof CSSStyleDeclaration, 'length' | 'parentRule'>;

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
export function listen<K extends keyof HTMLElementEventMap>(element: HTMLElement, event: K, cb: (event: HTMLElementEventMap[K]) => void): void;
export function listen<K extends keyof SVGElementEventMap>(element: SVGElement, event: K, cb: (event: SVGElementEventMap[K]) => void): void;
export function listen(element: EventTarget, event: string, cb: (event: Event) => void): void;
export function listen(element: EventTarget, event: string, cb: (event: Event) => void) {
  element.addEventListener(event, cb);
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
 * Sets any attribute to HTMLElement
 */
export function setAttribute(element: Element, attr: string, value: MaybeMutatable<string>) {
  useMaybeMutatable(element, value, (v) => element.setAttribute(attr, v));
}

/**
 * Gets attribute from HTMLElement
 */
export function getAttribute(element: HTMLElement, attr: string): string {
  return element.getAttribute(attr) || '';
}

/**
 * Sets class name to HTMLElement
 */
export function setClassName(element: Element, className: MaybeMutatable<string>) {
  useMaybeMutatable(element, className, (cn) => { element.className = cn; });
}

/**
 * Sets style to HTMLElement
 */
export function setStyle(element: HTMLElement | SVGElement, style: Partial<Pick<CSSStyleDeclaration, WritableCSSProps>>) {
  // To Do: Support of mutation
  const props = Object.keys(style) as WritableCSSProps[];

  for (let i = 0; i < props.length; i++) {
    // To Do: Fix
    element.style[props[i]] = style[props[i]];
  }
}

/**
 * Updates value at HTMLElement and disatch input event;x
 */
export function setValue(element: HTMLInputElement, value: MaybeMutatable<string>) {
  useMaybeMutatable(element, value, (v) => {
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

    if (propValue === undefined) {
      continue;
    }

    if (propName.slice(0, 2) === 'on') {
      listen(element, propName.slice(2).toLowerCase(), propValue);
      continue;
    }

    switch (propNames[i]) {
      case 'style':
        setStyle(element, propValue);
        break;

      case 'class':
      case 'className':
        if (element instanceof HTMLElement) {
          setClassName(element, propValue);
        } else {
          setAttribute(element, 'class', propValue);
        }
        break;

      case 'key':
        setAttribute(element, 'data-key', propValue);
        break;

      default:
        setAttribute(element, propNames[i], propValue);
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
  if (children.length > 0) {
    for (let i = 0; i < children.length; i += 1) {
      element.appendChild(children[i]);
    }
  }

  return element;
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
export function svgFromCode(code: string, props?: Record<string, any>): SVGSVGElement {
  svgFromCodeTempRoot.innerHTML = code;
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
