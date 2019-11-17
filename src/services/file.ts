import { InputFileLocation, UploadFile } from 'cache/types';
import client from 'client/client';
import { typeToMime, hexToBlob, blobToUrl } from 'helpers/files';
import { Bytes } from 'mtproto-js';

const MAX_CHUNK_SIZE = 1024 * 1024;

/**
 * Singleton service class for handling files
 */
export default class FileService {
  getFile(
    location: InputFileLocation,
    cb: (url: string) => void,
    dc: number = client.cfg.dc,
    mime: string = '',
    offset: number = 0,
    limit: number = MAX_CHUNK_SIZE,
    parts: string = '',
  ) {
    // todo cache lookup

    client.call('upload.getFile', { location, offset, limit }, { dc }, (err, result) => {
      // redirect to another dc
      if (err && err.message && err.message.indexOf('FILE_MIGRATE_') > -1) {
        this.getFile(location, cb, +err.message.slice(-1), mime, offset, limit, parts);
        return;
      }

      // todo handling errors
      if (err) {
        console.log(err);
        return;
      }

      if (!err && result) {
        this.processFile(location, result.json(), mime, dc, offset, limit, parts, cb);
      }
    });
  }

  processFile(
    location: InputFileLocation,
    file: UploadFile,
    imime: string,
    dc: number,
    offset: number,
    limit: number,
    parts: string,
    cb: (url: string) => void,
  ) {
    // todo load parts
    if (file.bytes.length / 2 === limit) {
      this.getFile(location, cb, dc, imime, offset + 4096, limit, parts + file.bytes.slice(0, 4096 * 2));
      return;
    }

    const mime = imime || typeToMime(file.type);
    const blob = hexToBlob(file.bytes, mime);

    const url = blobToUrl(blob);

    cb(url);
  }

  uploadFile(file: Bytes, cb: (id: Bytes, parts: number) => void) {
    const fid = new Bytes(8).randomize();
    this.saveFilePart(file, fid, cb);
  }

  saveFilePart = (file: Bytes, id: Bytes, cb: (id: Bytes, parts: number) => void, part: number = 0) => {
    const partSize = file.length < 102400 ? 32768 : 262144; // 256kb
    const total = Math.ceil(file.length / partSize);
    const uploaded = partSize * part;
    const remaining = Math.min(partSize * (part + 1), file.length - uploaded);

    console.log(part, file.slice(uploaded, uploaded + remaining).length, uploaded, remaining);
    const payload = {
      file_id: id.uint,
      file_part: part,
      bytes: file.slice(uploaded, uploaded + remaining).hex,
    };

    client.call('upload.saveFilePart', payload, (err, res) => {
      if (err || !res) cb(id, 0);

      if (res && res.json() === true) this.resolveUpload(file, id, part, total, cb);
    });
  };

  resolveUpload = (file: Bytes, id: Bytes, part: number, total: number, cb: (id: Bytes, parts: number) => void) => {
    if (part < total - 1) this.saveFilePart(file, id, cb, part + 1);
    else cb(id, total);
  };
}
