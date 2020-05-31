import { a } from 'core/html';

export type PhotoFitMode = 'contain' | 'cover';

export type PhotoOptions = {
  fit?: PhotoFitMode,
  width?: number,
  height?: number,
  minWidth?: number,
  minHeight?: number,
  thumb?: boolean | string,
  showLoader?: boolean,
};

export function downloadByUrl(filename: string, href: string) {
  // const f = form({ action: href, method: 'POST' },
  //   input({ type: 'text', value: filename, name: 'filename' }),
  // );

  // document.body.appendChild(f);
  // f.submit();
  // f.remove();
  const link = a({ download: filename, href, style: { display: 'none ' } });
  link.click();
}

export function todoAssertHasValue<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    // eslint-disable-next-line no-console
    console.warn('ASSERT: Empty value');
  }
  return value!;
}

const abbrev = 'KMB';

function round(n: number, precision: number) {
  const prec = 10 ** precision;
  return Math.round(n * prec) / prec;
}

/**
 * Formats number to a human readable format like 6K or 1.1M.
 * @link https://stackoverflow.com/a/10600491
 * @param n number to be formatted
 */
export function formatNumber(n: number) {
  let base = Math.floor(Math.log(Math.abs(n)) / Math.log(1000));
  const suffix = abbrev[Math.min(2, base - 1)];
  base = abbrev.indexOf(suffix) + 1;
  return suffix ? round(n / (1000 ** base), 1) + suffix : `${n}`;
}

// safari polyfill
if (!window.queueMicrotask) {
  window.queueMicrotask = (cb: () => void) => cb();
}

function isIOS() {
  if (/iPad|iPhone|iPod/.test(navigator.platform)) {
    return true;
  }
  // eslint-disable-next-line compat/compat
  return (navigator.maxTouchPoints && navigator.maxTouchPoints > 2) && /MacIntel/.test(navigator.platform);
}

function isChrome() {
  return navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
}

function isSafari() {
  return !isChrome() && navigator.userAgent.toLowerCase().indexOf('safari') > -1;
}

export const Safari = isSafari();
export const iOS = isIOS();
export const Chrome = isChrome();
