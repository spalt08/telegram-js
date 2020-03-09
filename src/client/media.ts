import { InputFileLocation } from 'client/schema';
import { locationToString } from 'helpers/files';
import { fileCache } from 'cache';
import { task, listenMessage } from './context';
import { UploadResolver, UploadProgressResolver, DownloadResolver,
  DownloadProgressResolver, DownloadOptions } from './types';

type FileID = string;

/**
 * Request resolvers to avoid parallel requests
 */
const downloadResolvers: Record<FileID, DownloadResolver[]> = {};
const downloadProgressResolvers: Record<FileID, DownloadProgressResolver[]> = {};
const uploadResovers: Record<FileID, UploadResolver> = {};
const uploadProgressResovers: Record<FileID, UploadProgressResolver> = {};

/**
 * Lookup cached file
 */
export function cached(location: InputFileLocation): string | undefined {
  return fileCache.get(locationToString(location));
}

/**
 * Request for file downloading
 */
export function download(location: InputFileLocation, options: DownloadOptions, ready: DownloadResolver, progress?: DownloadProgressResolver) {
  const id = locationToString(location);
  const cachedURL = cached(location);

  // already downloaded
  if (cachedURL) {
    ready(cachedURL);

  // already processing
  } else if (downloadResolvers[id]) {
    downloadResolvers[id].push(ready);
    if (progress) downloadProgressResolvers[id].push(progress);

  // should download
  } else {
    downloadResolvers[id] = [ready];
    downloadProgressResolvers[id] = [];
    if (progress) downloadProgressResolvers[id].push(progress);

    task('download', { id, location, options });
  }
}

/**
 * Request for file uploading
 */
export function upload(file: File, ready: UploadResolver, progress?: UploadProgressResolver) {
  const id = (Math.floor(Math.random() * 0xFFFFFFFF).toString(16) + Math.floor(Math.random() * 0xFFFFFFFF).toString(16)).slice(-8);

  uploadResovers[id] = ready;
  if (progress) uploadProgressResovers[id] = progress;
  task('upload', { id, file });
}

export default { cached, upload, download };

/**
 * Resolve downloading progress
 */
listenMessage('download_progress', ({ id, downloaded, total }) => {
  const progressListeners = downloadProgressResolvers[id];

  if (!progressListeners) return;
  for (let i = 0; i < progressListeners.length; i += 1) progressListeners[i](downloaded, total);
});

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
listenMessage('download_ready', ({ id, url }) => {
  fileCache.put(id, url);

  const readyListeners = downloadResolvers[id];

  if (readyListeners) {
    for (let i = 0; i < readyListeners.length; i += 1) readyListeners[i](url);
  }

  delete downloadResolvers[id];
  delete downloadProgressResolvers[id];
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
