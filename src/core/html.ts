import { ElementFactory } from './factory';
// eslint-disable-next-line import/named
import { MaybeMutatable, Mutatable } from './mutation';

export function text(value: MaybeMutatable<{ toString(): string; }>) {
  if (value instanceof Mutatable) {
    const node = document.createTextNode('');
    value.subscribe((newValue) => {
      node.textContent = newValue.toString();
    });
    return node;
  }
  return document.createTextNode(value.toString());
}

export const div = ElementFactory('div');
export const span = ElementFactory('span');
export const form = ElementFactory('form');
export const img = ElementFactory('img');
export const h1 = ElementFactory('h1');
export const p = ElementFactory('p');
export const input = ElementFactory('input');
