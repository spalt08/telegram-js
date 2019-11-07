/* eslint-disable no-redeclare, no-param-reassign */
import { MaybeMutatable } from './mutation';
import { isMountTriggered, triggerMount, triggerUnmount, useMaybeMutable } from './hooks';

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
 * Mounts HTMLElement or Component to parent HTMLElement
 * @param {Node} parent Element to mount in
 * @param {Node} child Element which mounted
 * @param {Node} [before] Element to mount before which
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
 * @param element HTML Element
 * @param attr Attribute name
 * @param value Attribute value
 */
export function setAttribute(element: Element, attr: string, value: MaybeMutatable<string>) {
  useMaybeMutable(element, value, (v) => element.setAttribute(attr, v));
}

/**
 * Gets attribute from HTMLElement
 * @param {HTMLElement} element HTML Element
 * @param {string} attr Attribute name
 */
export function getAttribute(element: HTMLElement, attr: string): string {
  return element.getAttribute(attr) || '';
}

/**
 * Sets class name to HTMLElement
 * @param element HTML Element
 * @param className Class name to set
 */
export function setClassName(element: Element, className: MaybeMutatable<string>) {
  useMaybeMutable(element, className, (cn) => { element.className = cn; });
}

/**
 * Sets style to HTMLElement
 */
export function setStyle(element: HTMLElement, style: Partial<Pick<CSSStyleDeclaration, WritableCSSProps>>) {
  // To Do: Support of mutation
  const props = Object.keys(style) as WritableCSSProps[];

  for (let i = 0; i < props.length; i++) {
    // To Do: Fix
    element.style[props[i]] = style[props[i]];
  }
}

/**
 * Updates value at HTMLElement and disatch input event;
 * @param element HTML Element
 * @param value Value to set
 */
export function setValue(element: HTMLInputElement, value: MaybeMutatable<string>) {
  useMaybeMutable(element, value, (v) => {
    element.value = v;
    element.dispatchEvent(new Event('input'));
  });
}

/**
 * Creates DOM element and returns it
 * @param {string} tag Tag name for element
 * @param {Object} props Properties for creation
 * @param {Node[]} children Child nodes or components
 */
export function el<T extends keyof HTMLElementTagNameMap>(tag: T, props?: Record<string, any>, children?: Node[]): HTMLElementTagNameMap[T];
export function el(tag: string, props?: Record<string, any>, children?: Node[]): HTMLElement;
export function el(tag: string, props: Record<string, any> = {}, children: Node[] = []): HTMLElement {
  const element = document.createElement(tag);

  // Setting props
  if (typeof props === 'object') {
    const propNames = Object.keys(props);
    for (let i = 0; i < propNames.length; i++) {
      switch (propNames[i]) {
        case 'className':
          setClassName(element, props.className);
          break;

        case 'style':
          setStyle(element, props.style);
          break;

        case 'key':
          setAttribute(element, 'data-key', props.key);
          break;

        case 'onClick':
          element.addEventListener('click', props.onClick);
          break;

        case 'onSubmit':
          element.addEventListener('submit', props.onSubmit);
          break;

        case 'onMouseEnter':
          element.addEventListener('mouseenter', props.onMouseEnter);
          break;

        case 'onAnimationEnd':
          element.addEventListener('animationend', props.onAnimationEnd);
          break;

        default:
          setAttribute(element, propNames[i], props[propNames[i]]);
      }
    }
  }

  // Mounting children
  if (children.length > 0) {
    for (let i = 0; i < children.length; i += 1) {
      element.appendChild(children[i]);
    }
  }

  return element;
}

/**
 * Attaches event listener to element
 * @param element DOM Element
 * @param event Event to listen
 * @param cb Event listener function
 */
export function listen<K extends keyof HTMLElementEventMap>(
  element: HTMLElement,
  event: string,
  cb: undefined | ((event: HTMLElementEventMap[K]) => void),
) {
  if (typeof cb !== 'function') return;

  element.addEventListener(event, cb);
}

/**
 * Dispatch element event
 * @param element DOM Element
 * @param eventName Event to dispatch
 */
export function dispatch(element: HTMLElement, eventName: string) {
  element.dispatchEvent(new Event(eventName));
}
