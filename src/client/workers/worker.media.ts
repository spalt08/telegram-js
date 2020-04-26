import { InputFileLocation, InputFile, Client } from 'mtproto-js';
import { DownloadOptions } from 'client/types';
import { typeToMime } from 'helpers/files';

// constants
const DOWNLOAD_CHUNK_LIMIT = 512 * 1024;

// states
const reader = new FileReaderSync();

const downloading: Record<string, {
  location: InputFileLocation,
  options: DownloadOptions,
  partSize: number,
  parts: number,
  chunks: Uint8Array[],
}> = {};

const uploading: Record<string, {
  data: Uint8Array,
  size: number,
  name: string,
  partSize: number,
  total: number,
  big: boolean,
}> = {};

interface Notification {
  (name: 'download_ready', payload: { id: string, url: string }): void
  (name: 'download_progress', payload: { id: string, downloaded: number, total: number }): void
  (name: 'upload_progress', payload: { id: string, uploaded: number, total: number }): void
  (name: 'upload_ready', payload: { id: string, inputFile: InputFile }): void
}

/**
 * Get file chunk
 * @mtproto upload.getFile
 */
function downloadFileChunkLoop(client: Client, id: string, part: number, notify: Notification) {
  if (!downloading[id]) throw new Error(`Missing downloading state for ${id}`);

  const { partSize, options, location, parts } = downloading[id];
  const offset = part * partSize;

  const params = {
    location,
    offset,
    limit: partSize,
  };

  const headers = {
    dc: options.dc_id || client.cfg.dc,
    thread: 2,
  };

  client.call('upload.getFile', params, headers, (err, result) => {
    // redirect to another dc
    if (err && err.message && err.message.indexOf('FILE_MIGRATE_') > -1) {
      downloading[id].options.dc_id = +err.message.slice(-1);
      downloadFileChunkLoop(client, id, part, notify);
      return;
    }

    // todo handling errors
    if (err || !result || result._ === 'upload.fileCdnRedirect') {
      throw new Error(`Error while donwloading file: ${JSON.stringify(err)}`);
      return;
    }

    if (!err && result) {
      downloading[id].chunks.push(new Uint8Array(result.bytes));

      if ((parts && part < parts - 1) || (!parts && result.bytes.byteLength >= partSize)) {
        downloadFileChunkLoop(client, id, part + 1, notify);
        if (options.size) notify('download_progress', { id, downloaded: offset + result.bytes.byteLength, total: options.size });
      } else {
        const type = options.mime_type || typeToMime(result.type);
        const blob = new Blob(downloading[id].chunks, { type });
        const url = (URL || webkitURL).createObjectURL(blob);

        notify('download_ready', { id, url });

        delete downloading[id];
      }
    }
  });
}

/**
 * Download file
 */
export function downloadFile(client: Client, id: string, location: InputFileLocation, options: DownloadOptions, notify: Notification) {
  const partSize = DOWNLOAD_CHUNK_LIMIT;

  downloading[id] = {
    location,
    options,
    partSize,
    parts: options.size ? Math.ceil(options.size / partSize) : 0,
    chunks: [],
  };

  if (options.size) notify('download_progress', { id, downloaded: 0, total: options.size });

  downloadFileChunkLoop(client, id, 0, notify);
}

/**
 * File managers: saveFilePart
 */
function uploadFileChunkLoop(client: Client, id: string, part: number, notify: Notification) {
  if (!uploading[id]) return;

  const { partSize, size, data, big, total, name } = uploading[id];
  const uploaded = partSize * part;
  const remaining = Math.min(partSize, size - uploaded);

  const payload = {
    file_id: id,
    file_part: part,
    bytes: data.slice(uploaded, uploaded + remaining),
    md5_checksum: '',
  };

  // @ts-ignore
  client.call(big ? 'upload.saveFilePartBig' : 'upload.saveFilePart', payload, { thread: 2 }, (err, res) => {
    if (err || !res) throw new Error(`Error while uploadig file: ${JSON.stringify(err)}`);

    if (part < total - 1) {
      notify('upload_progress', { id, uploaded: uploaded + remaining, total: size });
      uploadFileChunkLoop(client, id, part + 1, notify);
    } else {
      notify('upload_ready', {
        id,
        inputFile: {
          _: big ? 'inputFileBig' : 'inputFile',
          id,
          parts: total,
          name,
          md5_checksum: '',
        },
      });

      delete uploading[id];
    }
  });
}

/**
 * Upload file
 */
export function uploadFile(client: Client, id: string, file: File, notify: Notification) {
  let partSize = 262144; // 256 Kb

  if (file.size > 67108864) {
    partSize = 524288;
  } else if (file.size < 102400) {
    partSize = 32768;
  }

  notify('upload_progress', { id, uploaded: 0, total: file.size });

  uploading[id] = {
    data: new Uint8Array(reader.readAsArrayBuffer(file)),
    size: file.size,
    name: file.name,
    partSize,
    total: Math.ceil(file.size / partSize),
    big: file.size > 1024 * 1024 * 10,
  };

  uploadFileChunkLoop(client, id, 0, notify);
}
