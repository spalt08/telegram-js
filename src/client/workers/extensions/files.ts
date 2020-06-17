/* eslint-disable no-restricted-globals */
/* eslint-disable no-param-reassign */
import { DownloadOptions } from 'client/types';
import { StickerMimeType } from 'const';
import { InputFileLocation } from 'mtproto-js';
import { inflate } from 'pako/lib/inflate';
import { isWebpSupported } from 'helpers/browser';
import { workerTask } from './context';

// constants
const DOWNLOAD_CHUNK_LIMIT = 1024 * 1024;
const MAX_CONCURRENT_DOWNLOADS = 4;

export interface FilePartResolver {
  (location: InputFileLocation, offset: number, limit: number, options: DownloadOptions, ready: (data: ArrayBuffer, mime?: string) => void): void,
}

export interface ProgressResolver {
  (url: FileURL, downloaded: number, total: number): void,
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
 * File Infos, Resolvers and Queue
 */
const files = new Map<FileURL, FileInfo>();
const fileEvents: Record<FileURL, Array<(res: Response) => void>> = {};
const fileQueue: FileURL[] = [];
let currentlyProcessing = 0;

export function ungzipResponse(response: Response, mime: string = 'application/json') {
  return response.arrayBuffer()
    .then((buffer) => new Response(
      inflate(new Uint8Array(buffer), { to: 'string' }),
      {
        headers: {
          'Content-Type': mime,
        },
      },
    ));
}

function finishDownload(info: FileInfo, blob: Blob | Response, cache: Cache, get: FilePartResolver, progress: ProgressResolver) {
  const response = blob instanceof Response ? blob : new Response(blob);

  if (fileEvents[info.url]) for (let i = 0; i < fileEvents[info.url].length; i++) fileEvents[info.url][i](response.clone());
  if (info.chunks.length <= 10) cache.put(info.url, response); // 10 mb cache limit

  delete fileEvents[info.url];
  info.chunks = [];
  info.processing = false;
  currentlyProcessing--;

  // Pass Control to queued files
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  processQueuedDownloads(get, cache, progress);
}

export function respondDownload(url: string, response: Response, cache: Cache) {
  const info = files.get(url);

  if (!info) return;

  if (fileEvents[info.url]) for (let i = 0; i < fileEvents[info.url].length; i++) fileEvents[info.url][i](response.clone());
  cache.put(info.url, response);

  delete fileEvents[info.url];
  info.processing = false;
}

/**
 * Loop for getting file parts from network
 */
export function loopDownload(info: FileInfo, get: FilePartResolver, cache: Cache, progress: ProgressResolver) {
  const offset = info.chunks.length * DOWNLOAD_CHUNK_LIMIT;
  const limit = DOWNLOAD_CHUNK_LIMIT;

  get(info.location, offset, limit, info.options, (ab, type) => {
    info.chunks.push(ab);

    // notify progress
    if (info.options.progress && info.options.size) progress(info.url, offset + ab.byteLength, info.options.size);

    if (ab.byteLength < limit || (info.options!.size && info.options!.size < offset + limit)) {
      // middlewares
      switch (info.options.mime_type) {
        case StickerMimeType.TGS: {
          const response = new Response(new Blob(info.chunks, { type: type || info.options.mime_type }));
          ungzipResponse(response)
            .then((json) => finishDownload(info, json, cache, get, progress));
          break;
        }

        case StickerMimeType.WebP:
          if (!isWebpSupported) {
            workerTask('webp', { url: info.url, data: ab });
            info.chunks = [];
            currentlyProcessing--;
            // Pass Control to queued files
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            processQueuedDownloads(get, cache, progress);
            break;
          }

        // eslint-disable-next-line no-fallthrough
        default: {
          const response = new Response(new Blob(info.chunks, { type: type || info.options.mime_type }));
          finishDownload(info, response, cache, get, progress);
        }
      }
    } else {
      loopDownload(info, get, cache, progress);
    }
  });
}

/**
 * Download Initializator
 */
export function initDownload(url: FileURL | string, get: FilePartResolver, cache: Cache, progress: ProgressResolver) {
  const info = files.get(url);

  if (info && !info.processing) {
    info.processing = true;
    loopDownload(info, get, cache, progress);
  }
}

/**
 * Memrise File Location for Future Use and Download if Requested
 */
export function fetchFileLocation(url: FileURL | string, location: InputFileLocation, options: DownloadOptions, get: FilePartResolver,
  cache: Cache, progress: ProgressResolver) {
  if (!files.get(url)) files.set(url, { url, location, options, chunks: [] });
  if (fileEvents[url] && fileEvents[url].length > 0) initDownload(url, get, cache, progress);
}

/**
 * Download Initializator
 */
export function processQueuedDownloads(get: FilePartResolver, cache: Cache, progress: ProgressResolver) {
  while (fileQueue.length > 0 && currentlyProcessing < MAX_CONCURRENT_DOWNLOADS) {
    const url = fileQueue.shift();
    if (url) {
      currentlyProcessing++;
      initDownload(url, get, cache, progress);
    }
  }
}

/**
 * Download Queue
 */
export function putDownloadQueue(url: string, get: FilePartResolver, cache: Cache, progress: ProgressResolver) {
  if (fileQueue.indexOf(url) > -1) return;

  fileQueue.push(url);
  fileQueue.sort((left, right) => (files.get(right)!.options.priority || 0) - (files.get(left)!.options.priority || 0));
  processQueuedDownloads(get, cache, progress);
}

/**
 * Capture fetch request for queued downloads
 */
export function fetchRequest(url: string, resolve: (res: Response) => void, get: FilePartResolver, cache: Cache, progress: ProgressResolver) {
  if (!fileEvents[url]) fileEvents[url] = [];
  fileEvents[url].push(resolve);
  putDownloadQueue(url, get, cache, progress);
}

/**
 * Loop for getting file parts from network
 */
export function streamLoop(info: FileInfo, controller: ReadableStreamDefaultController, get: FilePartResolver, offset = 0) {
  const limit = DOWNLOAD_CHUNK_LIMIT;

  get(info.location, offset, limit, info.options, (ab) => {
    controller.enqueue(new Uint8Array(ab));

    if (ab.byteLength < limit) controller.close();
    else streamLoop(info, controller, get, offset + limit);
  });
}

export function download(url: string, filename: string, get: FilePartResolver) {
  const info = files.get(url);

  const headers: Record<string, string> = {
    'Content-Disposition': `attachment; filename="${filename}"`,
  };

  if (!info) return new Response(null, { status: 404 });

  if (info.options.size) headers['Content-Length'] = info.options.size.toString();
  if (info.options.mime_type) headers['Content-Type'] = info.options.mime_type;

  // eslint-disable-next-line compat/compat
  const stream = new ReadableStream({
    start(controller: ReadableStreamDefaultController) {
      streamLoop(info, controller, get);
    },
  });

  const response = new Response(
    stream,
    { headers },
  );

  return response;
}

export function blobLoop(url: string, location: InputFileLocation, options: DownloadOptions, get: FilePartResolver, ready: (blob: Blob) => void,
  progress: ProgressResolver, offset = 0, chunks: ArrayBuffer[] = []) {
  const limit = DOWNLOAD_CHUNK_LIMIT;

  get(location, offset, limit, options, (ab) => {
    if (options.progress && options.size) progress(url, offset + ab.byteLength, options.size);

    chunks.push(ab);

    if (ab.byteLength < limit) ready(new Blob(chunks));
    else blobLoop(url, location, options, get, ready, progress, offset + limit, chunks);
  });
}
