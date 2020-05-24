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
 * @todo Consider using binary tree instead
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
    // eslint-disable-next-line no-nested-ternary
    const compareResult = dstI < endIndex && srcI < source.length
      ? compare(destination[dstI], source[srcI])
      : (dstI < endIndex ? -1 : 1);

    if (compareResult === 0) {
      intersection.push(destination[dstI]);
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

// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
export function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getFirstLetter(str: string) {
  if (!str) return '';
  for (let i = 0; i < str.length; i++) {
    if (str[i].toUpperCase() !== str[i].toLowerCase()) {
      return str[i];
    }
    if (str[i] >= '0' && str[i] <= '9') {
      return str[i];
    }
    // surrogate pair (U+D800 to U+DFFF)
    if ((str.charCodeAt(i) & 0xf800) === 0xd800) {
      return str.slice(i, 2);
    }
  }

  return '';
}

export function getFirstLetters(title: string) {
  if (!title) return '';
  if (title.length === 0) return '';

  const split = title.split(' ');
  if (split.length === 1) {
    return getFirstLetter(split[0]);
  }
  if (split.length > 1) {
    return getFirstLetter(split[0]) + getFirstLetter(split[1]);
  }

  return '';
}

export function areIteratorsEqual(it1: Iterator<any, any, undefined>, it2: Iterator<any, any, undefined>): boolean {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result1 = it1.next();
    const result2 = it2.next();

    if (result1.done !== result2.done || result1.value !== result2.value) {
      return false;
    }

    if (result1.done) {
      return true;
    }
  }
}
