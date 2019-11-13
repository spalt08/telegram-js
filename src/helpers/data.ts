// eslint-disable-next-line import/prefer-default-export
export function arrayToMap<K extends keyof any, T extends { [key in K]: keyof any }>(items: T[], key: K): Record<T[K], T> {
  const map = {} as Record<T[K], T>;
  for (let i = 0; i < items.length; ++i) {
    map[items[i][key]] = items[i];
  }
  return map;
}
