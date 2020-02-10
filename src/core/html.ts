import { ElementFactory, createFragment } from './factory';
import { useMaybeObservable } from './hooks';
import { MaybeObservable } from './types'; // eslint-disable-line import/named

/**
 * Syntax sugar for rendering HTML tree
 *
 * @example
 *
 * form`.login`(
 *  h1`.title`(text('Enter something')),
 *  input({ type: 'text', placeholder: 'Something' }),
 * )
 */

export const div = ElementFactory('div');
export const span = ElementFactory('span');
export const form = ElementFactory('form');
export const img = ElementFactory('img');
export const h1 = ElementFactory('h1');
export const p = ElementFactory('p');
export const input = ElementFactory('input');
export const textarea = ElementFactory('textarea');
export const label = ElementFactory('label');
export const strong = ElementFactory('strong');
export const em = ElementFactory('em');
export const pre = ElementFactory('pre');
export const code = ElementFactory('code');
export const a = ElementFactory('a');

/**
 * Wrapper for any text children
 */
export function text(value: MaybeObservable<{ toString(): string; }>) {
  const node = document.createTextNode('');
  useMaybeObservable(node, value, (newValue) => {
    node.textContent = newValue.toString();
  });
  return node;
}

export const nothing = text('');
export const fragment = createFragment;
