import { InputFileLocation, Document } from 'mtproto-js';
import { BehaviorSubject } from 'rxjs';
import { locationToURL, getStreamServiceURL, getDocumentLocation } from 'helpers/files';
import { useWhileMounted, useOnMount, useObservable } from 'core/hooks';
import { task, listenMessage } from './context';
import { UploadResolver, UploadProgressResolver, DownloadResolver,
  DownloadProgressResolver, DownloadOptions } from './types';

type FileID = string;

const uploadResovers: Record<FileID, UploadResolver> = {};
const uploadProgressResovers: Record<FileID, UploadProgressResolver> = {};
const fileProgress: Record<string, BehaviorSubject<number>> = {};

let cache: Cache | undefined;
caches.open('files').then((c) => cache = c);

/**
 * Request for file uploading
 */
export function upload(f: File, ready: UploadResolver, progress?: UploadProgressResolver) {
  const id = (Math.floor(Math.random() * 0xFFFFFFFF).toString(16) + Math.floor(Math.random() * 0xFFFFFFFF).toString(16)).slice(-8);

  uploadResovers[id] = ready;
  if (progress) uploadProgressResovers[id] = progress;
  task('upload', { id, file: f });
}

/**
 * Resolve uploading progress
 */
listenMessage('upload_progress', ({ id, uploaded, total }) => {
  const resolver = uploadProgressResovers[id];
  if (resolver) resolver(uploaded, total);
});

/**
 * Resolve downloading response
 */
listenMessage('upload_ready', ({ id, inputFile }) => {
  const resolver = uploadResovers[id];
  if (resolver) resolver(inputFile);

  delete uploadResovers[id];
  delete uploadProgressResovers[id];
});

/**
 * Resolve file progress
 */
listenMessage('file_progress', ({ url, downloaded, total }) => {
  if (fileProgress[url]) fileProgress[url].next(downloaded);
  if (downloaded >= total) delete fileProgress[url];
});

/**
 * Get File URL
 */
export function file(location: InputFileLocation, options: DownloadOptions) {
  const url = locationToURL(location, options);

  task('location', { url, location, options });

  if (options.progress && !fileProgress[url]) fileProgress[url] = new BehaviorSubject(0);

  return url;
}

/**
 * Check Cache
 */
export function hasCached(url: string, cb: (result: boolean) => void) {
  if (!cache) cb(false);
  else cache.match(url).then((result) => cb(!!result));
}

/**
 * Get Stream URL
 */
export function stream(document: Document.document) {
  const url = getStreamServiceURL(document);
  task('location', { url, location: getDocumentLocation(document), options: { dc_id: document.dc_id, size: document.size } });

  return url;
}

export function useProgress(base: Node, url: string, onProgress: (downloaded: number) => void) {
  if (!fileProgress[url]) return;
  useObservable(base, fileProgress[url], onProgress);
}

/**
 * To do: remmove
 */
export function cached(_location: InputFileLocation): string | undefined {
  return undefined;
}
export function download(_location: InputFileLocation, _options: DownloadOptions, _ready: DownloadResolver, _progress?: DownloadProgressResolver) {}
