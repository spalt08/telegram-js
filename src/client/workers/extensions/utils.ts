import { InputFileLocation } from 'mtproto-js';
import { DownloadOptions } from 'client/types';
import { fetchFileLocation, FilePartResolver, ungzipResponse, ProgressResolver } from './files';
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
  return fetch(url).then(ungzipResponse);
}

function h2s(hex: string) {
  let str = '';
  for (let i = 0; i < hex.length * 2; i += 2) str += String.fromCharCode(+`0x${hex.slice(i, i + 2)}`);
  return str;
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

  return new Response(`
  <svg xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      width="${vw}" height="${vh}"
      viewBox="0 0 ${vw} ${vh}">
    <filter id="blur" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="5 5" edgeMode="duplicate" />
      <feComponentTransfer>
        <feFuncA type="discrete" tableValues="1 1" />
      </feComponentTransfer>
    </filter>
    <image filter="url(#blur)"
          xlink:href="data:image/jpeg;base64,${btoa(h2s(data))}"
          x="0" y="0"
          opacity="0.5"
          height="100%" width="100%"/>
  </svg>
  `, {
    headers: {
      'Content-Type': 'image/svg+xml',
    },
  });
}
