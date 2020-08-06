
import { InputFileLocation } from 'mtproto-js';
import { locationToURL } from 'helpers/files';
import { DownloadOptions } from 'client/types';

export const fileMap: Record<string, string> = {};

export default function getFilePart(location: InputFileLocation, offset: number, limit: number,
  _options: DownloadOptions, ready: (buf: ArrayBuffer, mime?: string) => void) {
  const url = fileMap[locationToURL(location)];

  setTimeout(() => {
    fetch(url)
      .then((resp) => resp.arrayBuffer())
      .then((buf) => ready(buf.slice(offset, offset + limit), ''));
  }, 1000);
}
