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
export function loadTGS(src: string, cb: (json: any) => void) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', src, true);
  xhr.responseType = 'arraybuffer';
  xhr.send();

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      let parsedData: object = {};
      if (xhr.status === 200) {
        try {
          parsedData = JSON.parse(inflate(xhr.response, { to: 'string' }));
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error);
        }
      } else {
        // eslint-disable-next-line no-lonely-if
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error(`Failed to download a TGS from ${src}`);
        }
      }
      cb(parsedData);
    }
  };
}
