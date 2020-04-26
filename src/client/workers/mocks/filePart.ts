import { InputFileLocation } from 'mtproto-js';
import { locationToString } from 'helpers/files';
import fileParts from './files';

export default function getFilePart(location: InputFileLocation, offset: number, limit: number, _options: any, cb: (buf: ArrayBuffer) => void) {
  const [, url] = fileParts[locationToString(location)];

  fetch(url)
    .then((resp) => resp.arrayBuffer())
    .then((buf) => {
      cb(buf.slice(offset, offset + limit));
    });
}
