import { task } from './client';

type GzipResolver = (data: string) => void;

/** Unzip with worker */
function ungzip(data: string, cb: GzipResolver) {
  task('ungzip', data, cb);
}

export default {
  ungzip,
};
