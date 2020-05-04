/* eslint-disable no-param-reassign */
import { InputFileLocation } from 'mtproto-js';
import { DownloadOptions } from 'client/types';

// constants
const DOWNLOAD_CHUNK_LIMIT = 1024 * 1024;
const MAX_CONCURRENT_DOWNLOADS = 4;

export interface FilePartResolver {
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
 * Loop for getting file parts from network
 */
export function loopDownload(info: FileInfo, get: FilePartResolver, cache: Cache) {
  const offset = info.chunks.length * DOWNLOAD_CHUNK_LIMIT;
  const limit = DOWNLOAD_CHUNK_LIMIT;

  get(info.location, offset, limit, info.options, (ab, type) => {
    info.chunks.push(ab);

    if (ab.byteLength < limit || (info.options!.size && info.options!.size < offset + limit)) {
      const response = new Response(new Blob(info.chunks, { type }));

      if (fileEvents[info.url]) for (let i = 0; i < fileEvents[info.url].length; i++) fileEvents[info.url][i](response.clone());
      if (info.chunks.length <= 4) cache.put(info.url, response);

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
 * Memrise File Location for Future Use and Download if Requested
 */
export function fetchFileLocation(url: FileURL | string, location: InputFileLocation, options: DownloadOptions, get: FilePartResolver,
  cache: Cache) {
  if (!files.get(url)) files.set(url, { url, location, options, chunks: [] });
  if (fileEvents[url] && fileEvents[url].length > 0) initDownload(url, get, cache);
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
export function fetchRequest(url: string, resolve: (res: Response) => void, get: FilePartResolver, cache: Cache) {
  if (!fileEvents[url]) fileEvents[url] = [];
  fileEvents[url].push(resolve);
  initDownload(url, get, cache);
}
