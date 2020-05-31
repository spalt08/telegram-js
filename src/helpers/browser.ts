
// safari polyfill
if (!self.queueMicrotask) {
  self.queueMicrotask = (cb: () => void) => cb();
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
