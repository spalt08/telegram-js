
import UPNG from 'upng-js';

export function encodePNG(rgba: ArrayBuffer, width: number, height: number) {
  return UPNG.encode([rgba], width, height, 0);
}

export function encodeAPNG(rgba: ArrayBuffer[], width: number, height: number, delays: number[]) {
  return UPNG.encode(rgba, width, height, 0, delays);
}
