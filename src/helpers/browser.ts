/* eslint-disable compat/compat */
export const isiOS = /iPad|iPhone|iPod/.test(navigator.platform)
  || ((navigator.maxTouchPoints && navigator.maxTouchPoints > 2) && /MacIntel/.test(navigator.platform));
export const isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
export const isSafari = !isChrome && navigator.userAgent.toLowerCase().indexOf('safari') > -1;
export const isWebpSupported = !isSafari;
