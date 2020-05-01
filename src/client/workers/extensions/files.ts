/* eslint-disable no-param-reassign */
import { InputFileLocation } from 'mtproto-js';
import { DownloadOptions } from 'client/types';
import { alignOffset, alignLimit } from 'helpers/stream';

// constants
const DOWNLOAD_CHUNK_LIMIT = 1024 * 1024;
const SMALLEST_CHUNK_LIMIT = 4 * 1024;

interface FilePartResolver {
  (location: InputFileLocation, offset: number, limit: number, options: DownloadOptions, ready: (data: ArrayBuffer, mime?: string) => void): void,
}

export type FileInfo = {
  url: string,
  location: InputFileLocation,
  options: DownloadOptions,
  events: Array<(res: Response) => void>,
  chunks: ArrayBuffer[],
  processing?: boolean,
};

export function resolveDownload(info: FileInfo, cache: Cache, get: FilePartResolver, force = false) {
  if (!force && info.processing) return;

  info.processing = true;

  const offset = info.chunks.length * DOWNLOAD_CHUNK_LIMIT;
  const limit = DOWNLOAD_CHUNK_LIMIT;

  get(info.location, offset, limit, info.options, (ab, type) => {
    info.chunks.push(ab);

    if (ab.byteLength < limit || (info.options.size && info.options.size < offset + limit)) {
      const blob = new Blob(info.chunks, { type });
      const response = new Response(ab);

      for (let i = 0; i < info.events.length; i++) {
        info.events[i](response);
      }

      if (info.chunks.length <= 3) cache.put(info.url, new Response(blob));

      info.events = [];
      info.chunks = [];
    } else {
      resolveDownload(info, cache, get, true);
    }
  });
}

export function resolveRangeRequest(info: FileInfo, offset: number, end: number, resolve: (r: Response) => void, get: FilePartResolver) {
  let limit = end ? alignLimit(end - offset + 1) : DOWNLOAD_CHUNK_LIMIT;
  offset = alignOffset(offset, limit);

  info.options.precise = true;

  get(info.location, offset, limit, info.options, (ab, type) => {
    console.log(info.url, offset, limit, ab.byteLength, info.options.size!);

    resolve(new Response(ab, {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${offset}-${offset + ab.byteLength - 1}/${info.options.size! || '*'}`,
        'Content-Length': `${ab.byteLength}`,
        'Content-Type': type || '',
      },
    }));
  });
}


// const reader = new FileReader();
// const uploading: Record<string, {
//   data: Uint8Array,
//   size: number,
//   name: string,
//   partSize: number,
//   total: number,
//   big: boolean,
// }> = {};

// interface Notification {
//   (name: 'upload_progress', payload: { id: string, uploaded: number, total: number }): void
//   (name: 'upload_ready', payload: { id: string, inputFile: InputFile }): void
// }

// /**
//  * File managers: saveFilePart
//  */
// function uploadFileChunkLoop(client: Client, id: string, part: number, notify: Notification) {
//   if (!uploading[id]) return;

//   const { partSize, size, data, big, total, name } = uploading[id];
//   const uploaded = partSize * part;
//   const remaining = Math.min(partSize, size - uploaded);

//   const payload = {
//     file_id: id,
//     file_part: part,
//     bytes: data.slice(uploaded, uploaded + remaining),
//     md5_checksum: '',
//   };

//   // @ts-ignore
//   client.call(big ? 'upload.saveFilePartBig' : 'upload.saveFilePart', payload, { thread: 2 }, (err, res) => {
//     if (err || !res) throw new Error(`Error while uploadig file: ${JSON.stringify(err)}`);

//     if (part < total - 1) {
//       notify('upload_progress', { id, uploaded: uploaded + remaining, total: size });
//       uploadFileChunkLoop(client, id, part + 1, notify);
//     } else {
//       notify('upload_ready', {
//         id,
//         inputFile: {
//           _: big ? 'inputFileBig' : 'inputFile',
//           id,
//           parts: total,
//           name,
//           md5_checksum: '',
//         },
//       });

//       delete uploading[id];
//     }
//   });
// }

// /**
//  * Upload file
//  */
// export function uploadFile(client: Client, id: string, file: File, notify: Notification) {
//   let partSize = 262144; // 256 Kb

//   if (file.size > 67108864) {
//     partSize = 524288;
//   } else if (file.size < 102400) {
//     partSize = 32768;
//   }

//   notify('upload_progress', { id, uploaded: 0, total: file.size });

//   uploading[id] = {
//     data: new Uint8Array(reader.readAsArrayBuffer(file)),
//     size: file.size,
//     name: file.name,
//     partSize,
//     total: Math.ceil(file.size / partSize),
//     big: file.size > 1024 * 1024 * 10,
//   };

//   uploadFileChunkLoop(client, id, 0, notify);
// }
