import { ElementFactory } from './factory';
import { MaybeMutatable } from './mutation';
import { useMaybeMutatable } from './hooks'; // eslint-disable-line import/named

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
export const label = ElementFactory('label');

/**
 * Wrapper for any text children
 */
export function text(value: MaybeMutatable<{ toString(): string; }>) {
  const node = document.createTextNode('');
  useMaybeMutatable(node, value, (newValue) => {
    node.textContent = newValue.toString();
  });
  return node;
}
