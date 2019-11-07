import { Mutatable } from './mutation';

export interface ComponentInterface<T extends HTMLElement> {
  element: T;
  // constructor (tag?: string, props?: Record<string, any>, children?: Child[]): ComponentInterface<T>;
  mountTo(parent?: Node): void;
  didMount(): void;
  unMount(): void;
}

export type Creator<T> = () => T;

export interface Factory<T> {
  new(): T,
}

export type Child = Node | HTMLDivElement | Mutatable<string | number> | string | number;
