import { InputFileLocation } from 'cache/types';
import { locationToString } from 'helpers/files';
import { fileCache } from 'cache';
import { task } from './client';

/**
 * File download callback
 */
type MediaResolver = (url: string | null) => void;

/**
 * Requested files and it's callbacks to avoid parallel requests
 */
const requests: Record<string, MediaResolver[]> = {};

/**
 * Update cache when url generated
 */
function resolve(location: InputFileLocation) {
  return (url: string | null) => {
    fileCache.put(locationToString(location), url);

    const id = locationToString(location);

    if (requests[id]) {
      for (let i = 0; i < requests[id].length; i += 1) {
        requests[id][i](url);
      }

      delete requests[id];
    }
  };
}

/** Search for file in cache */
function getCachedFile(location: InputFileLocation): string | null | undefined {
  return fileCache.get(locationToString(location));
}

/** Download file */
function getFile(location: InputFileLocation, cb: MediaResolver, dc_id?: number, mime?: string): string {
  const id = locationToString(location);
  const cached = getCachedFile(location);

  // already downloaded
  if (cached) {
    cb(cached);

  // already processing
  } else if (requests[id]) {
    requests[id].push(cb);

  // should download
  } else {
    requests[id] = [cb];
    task('get_file', { location, dc_id, mime }, resolve(location));
  }

  return id;
}

export default {
  get: getFile,
  cached: getCachedFile,
};