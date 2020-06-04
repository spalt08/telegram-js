/* eslint-disable no-param-reassign */
import { InputFileLocation } from 'mtproto-js';
import { alignOffset, alignLimit } from 'helpers/stream';
import { DownloadOptions } from 'client/types';
import type { FilePartResolver } from './files';
import { isSafari } from 'helpers/browser';

const STREAM_CHUNK_UPPER_LIMIT = 1024 * 1024;

type StreamURL = string;
type StreamInfo = {
  url: StreamURL,
  options: DownloadOptions,
  location: InputFileLocation
  atoms: {
    moovFound?: boolean,
    moovParsed?: boolean,
  }
};

const streams = new Map<StreamURL, StreamInfo>();

/**
 * Memrise Stream Location linked to URL for future use
 */
export function fetchStreamLocation(url: StreamURL, location: InputFileLocation, options: DownloadOptions) {
  if (!streams.get(url)) streams.set(url, { url, location, options: { ...options, precise: true }, atoms: {} });
}

/**
 * Capture fetch request for stream
 */
export function fetchStreamRequest(url: StreamURL, offset: number, end: number, resolve: (r: Response) => void, get: FilePartResolver) {
  const info = streams.get(url);

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

  const limit = end && end < STREAM_CHUNK_UPPER_LIMIT ? alignLimit(end - offset + 1) : STREAM_CHUNK_UPPER_LIMIT;
  const alignedOffset = alignOffset(offset, limit);

  get(info.location, alignedOffset, limit, info.options, (ab, type) => {
    const headers: Record<string, string> = {
      'Accept-Ranges': 'bytes',
      'Content-Range': `bytes ${alignedOffset}-${alignedOffset + ab.byteLength - 1}/${info.options.size! || '*'}`,
      'Content-Length': `${ab.byteLength}`,
    };

    if (type) headers['Content-Type'] = type;

    if (isSafari) {
      ab = ab.slice(offset - alignedOffset, end - alignedOffset + 1);
      headers['Content-Range'] = `bytes ${offset}-${offset + ab.byteLength - 1}/${info.options.size! || '*'}`;
      headers['Content-Length'] = `${ab.byteLength}`;
    }

    resolve(new Response(ab, {
      status: 206,
      statusText: 'Partial Content',
      headers,
    }));
  });
}
