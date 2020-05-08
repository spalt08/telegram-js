import { inflate } from 'pako/lib/inflate';
import { InputFileLocation } from 'mtproto-js';
import { DownloadOptions } from 'client/types';
import { fetchFileLocation, FilePartResolver } from './files';
import { fetchStreamLocation } from './stream';

/**
 * Memrise location for future use
 */
export function fetchLocation(url: string, location: InputFileLocation, options: DownloadOptions, get: FilePartResolver, cache: Cache) {
  const [, scope] = /\/(.+?)\//.exec(url) || [];

  switch (scope) {
    case 'stream':
      fetchStreamLocation(url, location, options);
      break;

    default:
      fetchFileLocation(url, location, options, get, cache);
  }
}


/**
 * Load and ungzip .tgs
 */
export function fetchTGS(url: string): Promise<Response> {
  return fetch(url)
    .then((response) => response.arrayBuffer())
    .then((buffer) => new Response(
      inflate(new Uint8Array(buffer), { to: 'string' }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    ));
}
