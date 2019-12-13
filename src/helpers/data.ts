/*
Helper functions to work with a pure data not related to any business logic
 */

export function arrayToMap<K extends keyof any, T extends { [key in K]: keyof any }>(items: T[], key: K): Record<T[K], T> {
  const map = {} as Record<T[K], T>;
  for (let i = 0; i < items.length; ++i) {
    map[items[i][key]] = items[i];
  }
  return map;
}

export function mapObject<T, P, K extends keyof any>(object: Record<K, T>, map: (value: T) => P): Record<K, P> {
  const newObject = {} as Record<K, P>;
  (Object.keys(object) as K[]).forEach((key) => {
    newObject[key] = map(object[key]);
  });
  return newObject;
}

// https://stackoverflow.com/q/4467539/1118709
export function modulo(dividend: number, divider: number): number {
  return ((dividend % divider) + divider) % divider;
}
