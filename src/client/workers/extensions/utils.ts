/* eslint-disable max-len */
import { InputFileLocation } from 'mtproto-js';
import { DownloadOptions } from 'client/types';
import { fetchFileLocation, FilePartResolver, ProgressResolver, ungzip } from './files';
import { fetchStreamLocation } from './stream';

/**
 * Memrise location for future use
 */
export function fetchLocation(url: string, location: InputFileLocation, options: DownloadOptions, get: FilePartResolver,
  cache: Cache, progress: ProgressResolver) {
  const [, scope] = /\/(.+?)\//.exec(url) || [];

  switch (scope) {
    case 'stream':
      fetchStreamLocation(url, location, options);
      break;

    default:
      fetchFileLocation(url, location, options, get, cache, progress);
  }
}

/**
 * Load and ungzip .tgs
 */
export function fetchTGS(url: string): Promise<Response> {
  return fetch(url).then((response) => response.arrayBuffer()).then((ab) => ungzip([ab]));
}

function h2s(hex: string) {
  let str = '';
  for (let i = 0; i < hex.length * 2; i += 2) str += String.fromCharCode(+`0x${hex.slice(i, i + 2)}`);
  return str;
}

export function fetchBlurredImage(data: string, vw: number, vh: number): Response {
  return new Response(`
  <svg xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      width="${vw}" height="${vh}"
      viewBox="0 0 ${vw} ${vh}">
    <filter id="blur" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="1 1" edgeMode="duplicate" />
      <feComponentTransfer>
        <feFuncA type="discrete" tableValues="1 1" />
      </feComponentTransfer>
    </filter>
    <image filter="url(#blur)"
          xlink:href="data:image/jpeg;base64,${btoa(data)}"
          x="0" y="0"
          opacity="0.6"
          height="100%" width="100%"/>
  </svg>
  `, {
    headers: {
      'Content-Type': 'image/svg+xml',
    },
  });
}

const jpegHeader = '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb\x00C\x00(\x1c\x1e#\x1e\x19(#!#-+(0<dA<77<{X]Id\x91\x80\x99\x96\x8f\x80\x8c\x8a\xa0\xb4\xe6\xc3\xa0\xaa\xda\xad\x8a\x8c\xc8\xff\xcb\xda\xee\xf5\xff\xff\xff\x9b\xc1\xff\xff\xff\xfa\xff\xe6\xfd\xff\xf8\xff\xdb\x00C\x01+--<5<vAAv\xf8\xa5\x8c\xa5\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xff\xc0\x00\x11\x08\x00\x00\x00\x00\x03\x01"\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04\x04\x00\x00\x01}\x01\x02\x03\x00\x04\x11\x05\x12!1A\x06\x13Qa\x07"q\x142\x81\x91\xa1\x08#B\xb1\xc1\x15R\xd1\xf0$3br\x82\t\n\x16\x17\x18\x19\x1a%&\'()*456789:CDEFGHIJSTUVWXYZcdefghijstuvwxyz\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93\x94\x95\x96\x97\x98\x99\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xf1\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xff\xc4\x00\x1f\x01\x00\x03\x01\x01\x01\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xc4\x00\xb5\x11\x00\x02\x01\x02\x04\x04\x03\x04\x07\x05\x04\x04\x00\x01\x02w\x00\x01\x02\x03\x11\x04\x05!1\x06\x12AQ\x07aq\x13"2\x81\x08\x14B\x91\xa1\xb1\xc1\t#3R\xf0\x15br\xd1\n\x16$4\xe1%\xf1\x17\x18\x19\x1a&\'()*56789:CDEFGHIJSTUVWXYZcdefghijstuvwxyz\x82\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93\x94\x95\x96\x97\x98\x99\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00?\x00';

/**
 * Load cached size image
 */
export function fetchSrippedSize(data: string): Response {
  let vw: number = 10; let vh: number = 10;

  // find actual image size from JPEG frame
  vh = +`0x${data.slice(2, 4)}`;
  vw = +`0x${data.slice(4, 6)}`;

  return fetchBlurredImage(
    // eslint-disable-next-line prefer-template
    jpegHeader.slice(0, 164)
    + String.fromCharCode(vh)
    + jpegHeader.charAt(165)
    + String.fromCharCode(vw)
    + jpegHeader.slice(167)
    + h2s(data.slice(6))
    + '\xff\xd9', vw, vh);
}

/**
 * Load cached size image
 */
export function fetchCachedSize(data: string): Response {
  let vw: number = 10; let vh: number = 10;

  // find actual image size from JPEG frame
  let pos = data.indexOf('ffc0');
  if (pos === -1) pos = data.indexOf('ffc2');
  if (pos >= -1) {
    vh = +`0x${data.slice(pos + 10, pos + 14)}`;
    vw = +`0x${data.slice(pos + 14, pos + 18)}`;
  }

  return fetchBlurredImage(h2s(data), vw, vh);
}
