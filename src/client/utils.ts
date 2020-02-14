import { task } from './client';

/*
type GzipResolver = (data: string) => void;
 */

/** Unzip with worker */
/*
export function ungzip(data: string, cb: GzipResolver) {
  task('ungzip', data, cb);
}
 */

/**
 * Load, ungzip and parse a TGS in a worker
 */
export function loadTgs(url: string, cb: (data: object) => void) {
  task('load_tgs', url, cb);
}
