/* eslint-disable no-redeclare, no-param-reassign */
import { Mutatable } from './mutation';
import { Child } from './types';

/**
 * Methods for manipulating with DOM.
 * All DOM manipulations should be done with this module.
 */

type WritableCSSProps = Exclude<keyof CSSStyleDeclaration, 'length' | 'parentRule'>;

/**
 * Mounts HTMLElement or Component to parent HTMLElement
 * @param {Node} parent Element to mount in
 * @param {Child} child Element which mounted
 * @returns {HTMLElement} Mounted Element
 */
export function mount(parent: Node, child: Child): Node {
  // Mounting mutatable value
  if (child instanceof Mutatable) {
    const node = document.createTextNode('');
    child.subscribe((text) => { node.textContent = text ? text.toString() : ''; });
    parent.appendChild(node);
    return node;
  }

  // Mounting text node
  if (typeof child === 'string' || typeof child === 'number') {
    const node = document.createTextNode(child.toString());
    parent.appendChild(node);
    return node;
  }

  // Mounting HTML Element
  if (child instanceof HTMLElement) {
    parent.appendChild(child);
    return child;
  }

  // Exception
  throw new Error('Unknow child type passed');
}

/**
 * Unmounts HTMLElement
 * @param {HTMLElement} element Mounted element
 */
export function unmount(element: any) {
  element.remove();
}

/**
 * Sets any attribute to HTMLElement
 * @param {HTMLElement} element HTML Element
 * @param {string} attr Attribute name
 * @param {string | Mutatable<string>} value Attribute value
 */
export function setAttribute(element: HTMLElement, attr: string, value: string | Mutatable<string>) {
  if (value instanceof Mutatable) {
    value.subscribe((v) => element.setAttribute(attr, v));
  } else {
    element.setAttribute(attr, value);
  }
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
 * @param {HTMLElement} element HTML Element
 * @param {string | Mutatable<string>} className Class name to set
 */
export function setClassName(element: HTMLElement, className: string | Mutatable<string>) {
  if (className instanceof Mutatable) {
    className.subscribe((cn) => { element.className = cn; });
  } else {
    element.className = className;
  }
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
 * @param {HTMLElement} element HTML Element
 * @param {string | Mutatable<string>} value Value to set
 */
export function setValue(element: HTMLElement, value: Child) {
  if (element instanceof HTMLInputElement) {
    if (value instanceof Mutatable) {
      value.subscribe((v) => {
        element.value = v.toString();
        element.dispatchEvent(new Event('input'));
      });
    } else {
      element.value = value.toString();
      element.dispatchEvent(new Event('input'));
    }
  }
}

/**
 * Creates DOM element and returns it
 * @param {string} tag Tag name for element
 * @param {Object} props Properties for creation
 * @param {Child[]} children Child nodes or components
 */
export function el<T extends keyof HTMLElementTagNameMap>(tag: T, props?: Record<string, any>, children?: Child[]): HTMLElementTagNameMap[T];
export function el(tag: string, props?: Record<string, any>, children?: Child[]): HTMLElement;
export function el(tag: string, props: Record<string, any> = {}, children: Child[] = []): HTMLElement {
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
      mount(element, children[i]);
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
export function listen(element: HTMLElement, event: string, cb: undefined | ((event: Event) => void)) {
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
