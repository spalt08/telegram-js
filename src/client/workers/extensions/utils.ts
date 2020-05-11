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
