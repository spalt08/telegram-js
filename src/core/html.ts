import { ElementFactory } from './factory';
// eslint-disable-next-line import/named
import { MaybeMutatable, Mutatable } from './mutation';
import { useOnMount } from './hooks';

export function text<T extends { toString(): string; }>(value: MaybeMutatable<T>) {
  if (!(value instanceof Mutatable)) {
    return document.createTextNode(value.toString());
  }

  const node = document.createTextNode('');
  const onNewValue = (newValue: T) => {
    node.textContent = newValue.toString();
  };
  useOnMount(node, () => {
    value.subscribe(onNewValue);
    return () => value.unsubscribe(onNewValue);
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
