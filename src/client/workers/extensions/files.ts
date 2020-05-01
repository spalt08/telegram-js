/* eslint-disable no-param-reassign */
import { InputFileLocation } from 'mtproto-js';
import { DownloadOptions } from 'client/types';
import { alignOffset, alignLimit } from 'helpers/stream';

// constants
const DOWNLOAD_CHUNK_LIMIT = 1024 * 1024;
const SMALLEST_CHUNK_LIMIT = 4 * 1024;
const MAX_CONCURRENT_DOWNLOADS = 4;

interface FilePartResolver {
  (location: InputFileLocation, offset: number, limit: number, options: DownloadOptions, ready: (data: ArrayBuffer, mime?: string) => void): void,
}

type FileURL = string;
type FileInfo = {
  url: string,
  location: InputFileLocation,
  options: DownloadOptions,
  chunks: ArrayBuffer[],
  processing?: boolean,
};

/**
 * File Infos, Resolvers and Quene
 */
const files = new Map<FileURL, FileInfo>();
const fileEvents: Record<FileURL, Array<(res: Response) => void>> = {};
const fileQuene: FileURL[] = [];
let currentlyProcessing = 0;

/**
 * Memrise File Location linked to URL for future use
 */
export function fetchLocation(url: FileURL | string, location: InputFileLocation, options: DownloadOptions): FileInfo {
  let info = files.get(url);

  if (!info) {
    info = { url, location, options, chunks: [] };
    files.set(url, info);
  }

  return info;
}

/**
 * Loop for getting file parts from network
 */
export function loopDownload(info: FileInfo, get: FilePartResolver, cache: Cache) {
  const offset = info.chunks.length * DOWNLOAD_CHUNK_LIMIT;
  const limit = DOWNLOAD_CHUNK_LIMIT;

  get(info.location, offset, limit, info.options, (ab, type) => {
    info.chunks.push(ab);

    if (ab.byteLength < limit || (info.options!.size && info.options!.size < offset + limit)) {
      const blob = new Blob(info.chunks, { type });
      const response = new Response(ab);

      if (fileEvents[info.url]) for (let i = 0; i < fileEvents[info.url].length; i++) fileEvents[info.url][i](response);
      if (info.chunks.length <= 4) cache.put(info.url, new Response(blob));

      info.chunks = [];
      info.processing = false;
      delete fileEvents[info.url];
      currentlyProcessing--;

      // Pass Control to quened files
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      processQuenedDownloads(get, cache);
    } else {
      loopDownload(info, get, cache);
    }
  });
}

/**
 * Download Initializator
 */
export function initDownload(url: FileURL | string, get: FilePartResolver, cache: Cache) {
  const info = files.get(url);

  if (info && !info.processing) {
    info.processing = true;
    loopDownload(info, get, cache);
  }
}

/**
 * Download Initializator
 */
export function processQuenedDownloads(get: FilePartResolver, cache: Cache) {
  while (fileQuene.length > 0 && currentlyProcessing < MAX_CONCURRENT_DOWNLOADS) {
    const url = fileQuene.shift();
    if (url) {
      currentlyProcessing++;
      initDownload(url, get, cache);
    }
  }
}

/**
 * Download Quene
 */
export function putDownloadQuene(url: string, get: FilePartResolver, cache: Cache) {
  fileQuene.push(url);
  fileQuene.sort((left, right) => (files.get(right)!.options.priority || 0) - (files.get(left)!.options.priority || 0));
  processQuenedDownloads(get, cache);
}

/**
 * Capture fetch request for quened downloads
 */
export function fetchRequest(url: string, resolve: (res: Response) => void) {
  if (!fileEvents[url]) fileEvents[url] = [];
  fileEvents[url].push(resolve);
}

/**
 * Download file part with provided range (streaming)
 */
export function streamPart(url: FileURL, offset: number, end: number, resolve: (r: Response) => void, get: FilePartResolver) {
  const info = files.get(url);

  if (!info) {
    resolve(new Response(null, { status: 302, headers: { Location: url } }));
    return;
  }

  // safari workaround
  if (offset === 0 && end === 1) {
    resolve(new Response(new Uint8Array(2).buffer, {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes 0-1/${info.options.size! || '*'}`,
        'Content-Length': '2',
        'Content-Type': 'video/mp4',
      },
    }));
    return;
  }

  const limit = end ? alignLimit(end - offset + 1) : DOWNLOAD_CHUNK_LIMIT;
  offset = alignOffset(offset, limit);

  info.options.precise = true;

  console.log('request', offset, limit, info.options);

  get(info.location, offset, limit, info.options, (ab, type) => {
    console.log(info.url, offset, limit, ab.byteLength, info.options.size!);

    const headers: Record<string, string> = {
      'Accept-Ranges': 'bytes',
      'Content-Range': `bytes ${offset}-${offset + ab.byteLength - 1}/${info.options.size! || '*'}`,
      'Content-Length': `${ab.byteLength}`,
    };

    if (type) headers['Content-Type'] = type;

    resolve(new Response(ab, {
      status: 206,
      statusText: 'Partial Content',
      headers,
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
