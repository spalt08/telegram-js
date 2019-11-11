import { Observable } from 'rxjs';

export type MaybeObservable<T> = T | Observable<T>;

export type MaybeObservableMap<T extends Record<any, any>> = {
  [K in keyof T]: MaybeObservable<T[K]>;
};

export type WritableCSSProps = Exclude<keyof CSSStyleDeclaration, 'length' | 'parentRule'>;

export type WritableStyles = Pick<CSSStyleDeclaration, WritableCSSProps>;
