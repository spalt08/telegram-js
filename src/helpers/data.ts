import binarySearch from 'binary-search';

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

/**
 * Puts items from ordered array `source` to ordered array `destination` (modifies it by reference) and keeps the given
 * order. Returns a boolean that says whether `destination` was modified.
 *
 * @see Array.prototype.sort for the `compare` description. It describes both arrays.
 */
export function mergeOrderedArrays<T>(
  destination: T[],
  source: Readonly<T[]>,
  compare: (a: T, b: T) => number,
): boolean {
  if (!source.length) {
    return false;
  }

  function findInArray(array: T[], item: T): number {
    const rawValue = binarySearch(array, item, compare);
    return rawValue >= 0 ? rawValue : (-rawValue - 1.5);
  }

  // Find a position where to insert. If the given ids ranges intersect.
  const startIndex = Math.ceil(findInArray(destination, source[0]));
  const endIndex = Math.floor(findInArray(destination, source[source.length - 1])) + 1;

  // Join the source with the destination items from the found position
  const intersection = [];
  let hasNewItems = false;
  for (let dstI = startIndex, srcI = 0; dstI < endIndex || srcI < source.length;) {
    const compareResult = compare(destination[dstI], source[dstI]);
    if (compareResult === 0) {
      intersection.push(source[srcI]);
      dstI += 1;
      srcI += 1;
    } else if (compareResult < 0) {
      intersection.push(destination[dstI]);
      dstI += 1;
    } else {
      intersection.push(source[srcI]);
      srcI += 1;
      hasNewItems = true;
    }
  }
  if (!hasNewItems) {
    return false;
  }

  destination.splice(startIndex, endIndex - startIndex, ...intersection);
  return true;
}
