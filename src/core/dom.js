// @flow

/**
 * Methods for manipulating with DOM.
 * All DOM manipulations should be done with this module.
 */

import Component from "./component";
import { Mutatable } from "./mutation";

export type ElementOrComponent = HTMLElement | Component<HTMLElement>;

/**
 * Mounts HTMLElement or Component to parent HTMLElement
 * @param {Node} parent Element to mount in
 * @param {ElementOrComponent} child Element which mounted
 */
export function mount(parent: Node | HTMLElement, child: any) {
  if (child instanceof Component) {
    child.mountTo(parent)
  } else if (typeof child === 'string' || typeof child === 'number') {
    if (child instanceof Mutatable) {
      const node = document.createTextNode('');
      child.subscribe(text => node.textContent = text);
    } else {
      parent.appendChild(document.createTextNode(child));
    }
  } else if (typeof child === 'function') {
    mount(parent, new child())
  } else {
    parent.appendChild(child)
  }
}

/**
 * Unmounts HTMLElement
 * @param {HTMLElement} element Mounted element
 */
export function unmount(element: any) {
  element.remove();
}

/** Setters */
export function setProp(element: any, propName: string, value: string | Mutatable<string>) {
  if (value instanceof Mutatable) {
    value.subscribe(v => { element[propName] = value });
  } else {
    element[propName] = value;
  }
}

export function setClass(element: HTMLElement, className: string | Mutatable<string>) {
  setProp(element, 'className', className);
}

export function setSrc(element: HTMLElement, src: string | Mutatable<string>) {
  if (element instanceof HTMLImageElement) {
    setProp(element, 'src', src);
  }
}

export function setType(element: HTMLElement, type: string | Mutatable<string>) {
  if (element instanceof HTMLInputElement) {
    setProp(element, 'type', type);
  }
}

declare function el(tag: 'div', ...rest: any): HTMLDivElement;
declare function el(tag: string, ...rest: any): HTMLElement;
declare function el<T>(tag: string, ...rest: any): T;

/**
 * Creates DOM element and returns it
 * @param {string} tag Tag name for element
 * @param {Object} props Properties for creation
 * @param {Array<ElementOrComponent>} children Child nodes or components
 */
export function el(tag: string, props: Object = {}, children: Array<ElementOrComponent> = []): HTMLElement {
  const element = document.createElement(tag);

  console.log(tag, props);
  
  // Setting props
  if (props.className) setClass(element, props.className);
  if (props.src) setSrc(element, props.src);
  if (props.type) setType(element, props.type);

  // Mounting children
  if (children.length > 0) {
    for (let i = 0; i < children.length; i += 1) {
      mount(element, children[i]);
    }
  }

  return element;
}