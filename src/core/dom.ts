/* eslint-disable no-redeclare, no-param-reassign */

/**
 * Methods for manipulating with DOM.
 * All DOM manipulations should be done with this module.
 */

import Component from './component';
import { Mutatable } from './mutation';
import { Child } from './types';

/**
 * Mounts HTMLElement or Component to parent HTMLElement
 * @param {Node} parent Element to mount in
 * @param {Child} child Element which mounted
 */
export function mount(parent: Node | HTMLElement, child: Child) {
  // Mounting component
  if (child instanceof Component) {
    child.mountTo(parent);

  // Mounting mutatable value
  } else if (child instanceof Mutatable) {
    const node = document.createTextNode(child.value);
    parent.appendChild(node);
    child.subscribe((text) => { node.textContent = text; });

  // Mounting text node
  } else if (typeof child === 'string' || typeof child === 'number') {
    parent.appendChild(document.createTextNode(child.toString()));

  // Mounting factory
  } else if (typeof child === 'function') {
    mount(parent, new child());

  // Mounting HTML Element
  } else {
    parent.appendChild(child);
  }
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
 * Updates value at HTMLElement and disatch input event;
 * @param {HTMLElement} element HTML Element
 * @param {string | Mutatable<string>} value Value to set
 */
export function setValue(element: HTMLElement, value: string | Mutatable<string>) {
  if (element instanceof HTMLInputElement) {
    if (value instanceof Mutatable) {
      value.subscribe((v) => {
        element.value = v;
        element.dispatchEvent(new Event('input'));
      });
    } else {
      element.value = value;
      element.dispatchEvent(new Event('input'));
    }
  }
}

/**
 * Creates DOM element and returns it
 * @param {string} tag Tag name for element
 * @param {Object} props Properties for creation
 * @param {Array<Child>} children Child nodes or components
 */
export function el<T>(tag: string, props?: Record<string, any>, children?: Array<Child>): T;
export function el(tag: string, props: Record<string, any> = {}, children: Array<Child> = []): HTMLElement {
  const element = document.createElement(tag);

  // Setting props
  if (typeof props === 'object') {
    const propNames = Object.keys(props);
    for (let i = 0; i < propNames.length; i++) {
      switch (propNames[i]) {
        case 'className':
          setClassName(element, props.className);
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

// export declare function el<T>(tag: string, props?: { [index: string]: any }, children?: Array<Child>): T;
