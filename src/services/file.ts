import { InputFileLocation, UploadFile } from 'cache/types';
import client from 'client/client';
import { typeToMime, hexToBlob, blobToUrl } from 'helpers/files';

/**
 * Singleton service class for handling files
 */
export default class FileService {
  getFile(location: InputFileLocation, cb: (url: string) => void, dc: number = client.cfg.dc, offset: number = 0, limit: number = 1024 * 1024) {
    // todo cache lookup

    client.call('upload.getFile', { location, offset, limit }, { dc }, (err, result) => {
      // redirect to another dc
      if (err && err.message && err.message.indexOf('FILE_MIGRATE_') > -1) {
        this.getFile(location, cb, +err.message.slice(-1), offset, limit);
        return;
      }

      // todo handling errors
      if (err) {
        console.log(err);
        return;
      }

      if (!err && result) {
        this.processFile(result.json(), offset, limit, cb);
      }
    });
  }

  processFile(file: UploadFile, offset: number, limit: number, cb: (url: string) => void) {
    // todo load parts
    if (file.type._ === 'storage.filePartial') {
      console.log('partial', file);
      return;
    }

    const mime = typeToMime(file.type);
    const blob = hexToBlob(file.bytes, mime);
    const url = blobToUrl(blob);

    cb(url);
  }
}