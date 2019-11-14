/*
Helper functions to work with a pure data not related to any business logic
 */

// eslint-disable-next-line import/prefer-default-export
export function arrayToMap<K extends keyof any, T extends { [key in K]: keyof any }>(items: T[], key: K): Record<T[K], T> {
  const map = {} as Record<T[K], T>;
  for (let i = 0; i < items.length; ++i) {
    map[items[i][key]] = items[i];
  }
  return map;
}

/**
 * Swaps elements in array
 */
export function arrayMove(arr: any[], from: number, to: number) {
  const copy = arr.slice(0);
  if (to >= copy.length) {
    let k = to - copy.length + 1;
    while (k--) {
      copy.push(undefined);
    }
  }
  copy.splice(to, 0, copy.splice(from, 1)[0]);
  return copy;
}
