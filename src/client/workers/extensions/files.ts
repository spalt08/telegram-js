/* eslint-disable no-restricted-globals */
/* eslint-disable no-param-reassign */
import { DownloadOptions } from 'client/types';
import { StickerMimeType } from 'const';
import { InputFileLocation } from 'mtproto-js';
import { inflate } from 'pako/lib/inflate';
import { Safari } from 'helpers/browser';
import { workerTask } from './context';

// constants
const DOWNLOAD_CHUNK_LIMIT = 1024 * 1024;
const MAX_CONCURRENT_DOWNLOADS = 2;

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

export function respondDownload(url: string, response: Response) {
  const info = files.get(url);

  if (!info) return;

  if (fileEvents[info.url]) for (let i = 0; i < fileEvents[info.url].length; i++) fileEvents[info.url][i](response.clone());

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
          if (Safari) {
            workerTask('webp', { url: info.url, data: ab });
            info.chunks = [];
            currentlyProcessing--;
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
  initDownload(url, get, cache, progress);
}
