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
const resolvers: Record<FileID, DownloadResolver[]> = {};

/**
 * Lookup cached file
 */
export function cached(location: InputFileLocation): string | undefined {
  return fileCache.get(locationToString(location));
}

/**
 * Request for file downloading
 */
export function download(location: InputFileLocation, options: DownloadOptions, ready: DownloadResolver, _progress?: DownloadProgressResolver) {
  const id = locationToString(location);
  const cachedURL = cached(location);

  // already downloaded
  if (cachedURL) {
    ready(cachedURL);

  // already processing
  } else if (resolvers[id]) {
    resolvers[id].push(ready);

  // should download
  } else {
    resolvers[id] = [ready];
    task('download', { id, location, options });
  }
}

export function upload(file: File, _ready: UploadResolver, _progress?: UploadProgressResolver) {
  const id = (Math.floor(Math.random() * 0xFFFFFFFF).toString(16) + Math.floor(Math.random() * 0xFFFFFFFF).toString(16)).slice(-8);

  task('upload', { id, file });
}

/**
 * Resolve downloading progress
 */
listenMessage('download_progress', ({ id, downloaded, total }) => {
  console.log(id, downloaded, total);
});

/**
 * Resolve uploading progress
 */
listenMessage('upload_progress', ({ id, uploaded, total }) => {
  console.log(id, uploaded, total);
});

/**
 * Resolve downloading response
 */
listenMessage('download_ready', ({ id, url }) => {
  fileCache.put(id, url);

  if (resolvers[id]) {
    for (let i = 0; i < resolvers[id].length; i += 1) resolvers[id][i](url);
    delete resolvers[id];
  }
});

/**
 * Resolve downloading response
 */
listenMessage('upload_ready', ({ id, inputFile }) => {
  console.log(id, inputFile);
});
