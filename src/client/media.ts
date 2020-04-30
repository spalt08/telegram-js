import { InputFileLocation } from 'mtproto-js';
import { locationToURL } from 'helpers/files';
import { task, listenMessage } from './context';
import { UploadResolver, UploadProgressResolver, DownloadResolver,
  DownloadProgressResolver, DownloadOptions } from './types';

type FileID = string;

const uploadResovers: Record<FileID, UploadResolver> = {};
const uploadProgressResovers: Record<FileID, UploadProgressResolver> = {};

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
 * Get File URL
 */
export function file(location: InputFileLocation, options: DownloadOptions) {
  const url = locationToURL(location, options);

  task('location', { url, location, options });

  return url;
}

/**
 * To do: remmove
 */
export function cached(_location: InputFileLocation): string | undefined {
  return undefined;
}
export function download(_location: InputFileLocation, _options: DownloadOptions, _ready: DownloadResolver, _progress?: DownloadProgressResolver) {}
