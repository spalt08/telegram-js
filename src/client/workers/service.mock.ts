/* eslint-disable no-restricted-globals */
import { WindowMessage } from 'client/types';
import { parseRange } from 'helpers/stream';
import { respond, notify } from './extensions/context';
import { fetchRequest, respondDownload } from './extensions/files';
import { callMock } from './mocks/call';
import getFilePart, { fileMap } from './mocks/files';
import { fetchStreamRequest } from './extensions/stream';
import { fetchLocation, fetchTGS, fetchCachedSize, fetchSrippedSize } from './extensions/utils';

require('./mocks/sticker');

const ctx = self as any as ServiceWorkerGlobalScope;
const cacheMock: Cache = { put: () => {} } as any;
const { log } = console;

// CLIENT_CONFIG.test = true

/**
 * Service Worker Installation
 */
ctx.addEventListener('install', () => {
  log('service worker is installing');
  ctx.skipWaiting();
});

/**
 * Service Worker Activation
 */
ctx.addEventListener('activate', (event) => {
  log('service worker activating', ctx);

  event.waitUntil(ctx.clients.claim());
});

function fileProgress(url: string, downloaded: number, total: number) {
  notify('file_progress', { url, downloaded, total });
}

/**
 * Listen Messages
 */
ctx.onmessage = (event) => {
  if (!event || !event.data || !event.data.type) return;

  const msg = event.data as WindowMessage;

  switch (msg.type) {
    case 'call': {
      const { id, payload: { method, params, headers } } = msg;
      callMock(method, params, headers, (error, result) => event.source && respond(event.source, id, 'rpc_result', { error, result }));
      break;
    }

    case 'location': {
      const { url, location, options } = msg.payload;
      fetchLocation(url, location, options, getFilePart, cacheMock, fileProgress);
      break;
    }

    case 'url_map': {
      const { url, map } = msg.payload;
      fileMap[url] = map;
      break;
    }

    case 'webp_loaded': {
      const { url, blob } = msg.payload;
      respondDownload(url, new Response(blob), cacheMock);
      break;
    }

    default:
  }
};

/**
 * Fetch requests
 */
ctx.addEventListener('fetch', (event: FetchEvent): void => {
  const [, url, scope] = /http[:s]+\/\/.*?(\/(.*?)\/.*$)/.exec(event.request.url) || [];

  switch (scope) {
    case 'documents':
    case 'photos':
    case 'profiles':
      event.respondWith(
        new Promise((resolve) => {
          fetchRequest(url, resolve, getFilePart, cacheMock, fileProgress);
        }),
      );
      break;

    case 'stream': {
      const [offset, end] = parseRange(event.request.headers.get('Range') || '');

      log('stream', url, offset, end);

      event.respondWith(new Promise((resolve) => {
        fetchStreamRequest(url, offset, end, resolve, getFilePart);
      }));
      break;
    }

    case 'cached': {
      const [, bytes] = /\/cached\/(.*?).svg/.exec(url) || [];
      event.respondWith(fetchCachedSize(bytes));
      break;
    }

    case 'stripped': {
      const [, bytes] = /\/stripped\/(.*?).svg/.exec(url) || [];
      event.respondWith(fetchSrippedSize(bytes));
      break;
    }

    default:
      if (url && url.indexOf('.tgs') > -1) event.respondWith(fetchTGS(url));
      else event.respondWith(fetch(event.request.url));
  }
});
