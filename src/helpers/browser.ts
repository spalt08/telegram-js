export const isiOS = /iPad|iPhone|iPod/.test(navigator.platform);
export const isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
export const isSafari = !isChrome && navigator.userAgent.toLowerCase().indexOf('safari') > -1;
