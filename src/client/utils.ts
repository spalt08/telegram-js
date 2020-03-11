import { request } from './context';

/**
 * Load, ungzip and parse a TGS in a worker
 */
export function loadTgs(url: string, cb: (data: object) => void) {
  request('load_tgs', url, cb);
}
