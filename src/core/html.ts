import { ElementFactory } from './factory';
import { MaybeMutatable } from './mutation';
import { useMaybeMutable } from './hooks'; // eslint-disable-line import/named

export function text(value: MaybeMutatable<{ toString(): string; }>) {
  const node = document.createTextNode('');
  useMaybeMutable(node, value, (newValue) => {
    node.textContent = newValue.toString();
  });
  return node;
}

export const div = ElementFactory('div');
export const span = ElementFactory('span');
export const form = ElementFactory('form');
export const img = ElementFactory('img');
export const h1 = ElementFactory('h1');
export const p = ElementFactory('p');
export const input = ElementFactory('input');
