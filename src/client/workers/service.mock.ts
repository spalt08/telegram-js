/* eslint-disable no-restricted-globals */
import { WindowMessage } from 'client/types';
import { respond } from './extensions/context';
import { resolveDownload, FileInfo } from './extensions/files';
import { callMock } from './mocks/call';
import getFilePart from './mocks/files';


const ctx = self as any as ServiceWorkerGlobalScope;
const NegativeResponse = new Response(null, { status: 503 });
const cacheMock: Cache = { put: () => {} } as any;

const files = new Map<string, FileInfo>();
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
      console.log('location', url, location, options);
      if (!files.get(url)) files.set(url, { url, location, options, events: [], chunks: [] });
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

  console.log('fetch', scope, url);

  switch (scope) {
    case 'documents':
    case 'photos':
    case 'profiles': {
      console.log(scope, url, files.get(url));
      const info = files.get(url);
      if (!info) return event.respondWith(NegativeResponse);

      event.respondWith(
        new Promise((resolve) => {
          info.events.push(resolve);
          resolveDownload(info, cacheMock, getFilePart);
        }),
      );
      break;
    }

    default:
      event.respondWith(fetch(event.request.url));
  }
});
