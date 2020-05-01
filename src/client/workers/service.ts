/* eslint-disable no-restricted-globals */
import { Client as NetworkHandler, InputFileLocation } from 'mtproto-js';
import { CLIENT_CONFIG } from 'const/api';
import { WindowMessage, DownloadOptions } from 'client/types';
import { typeToMime } from 'helpers/files';
import { parseRange } from 'helpers/stream';
import { createNotification, respond } from './extensions/context';
import { load, save } from './extensions/db';
import { resolveDownload, FileInfo, resolveRangeRequest } from './extensions/files';

type ExtendedWorkerScope = {
  cache: Cache,
  network: NetworkHandler,
};

const ctx = self as any as ServiceWorkerGlobalScope & ExtendedWorkerScope;
const notify = createNotification(ctx.clients);
const NegativeResponse = new Response(null, { status: 503 });

const files = new Map<string, FileInfo>();
const { log } = console;

// CLIENT_CONFIG.test = true
const dbkey = CLIENT_CONFIG.test ? 'metatest' : 'meta';
const initNetwork = () => load(dbkey).then((meta: any) => {
  if (ctx.network) return;

  ctx.network = new NetworkHandler({ ...CLIENT_CONFIG, meta, dc: meta.baseDC });

  ctx.network.on('metaChanged', (newMeta) => save(dbkey, newMeta));
  ctx.network.on('metaChanged', (state) => notify('authorization_updated', { dc: state.baseDC, user: state.userID || 0 }));
  ctx.network.on('networkChanged', (state) => notify('network_updated', state));
  ctx.network.updates.fetch();
});

function processWindowMessage(msg: WindowMessage, source: Client | MessagePort | ServiceWorker | null = null) {
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'call': {
      const { id, payload: { method, params, headers } } = msg;
      ctx.network.call(method, params, headers, (error, result) => source && respond(source, id, 'rpc_result', { error, result }));
      break;
    }

    case 'location': {
      const { url, location, options } = msg.payload;
      if (!files.get(url)) files.set(url, { url, location, options, events: [], chunks: [] });
      break;
    }

    case 'password_kdf': {
      const { id, payload: { algo, password } } = msg;
      ctx.network.getPasswordKdfAsync(algo, password, (srp: any) => source && respond(source, id, 'password_kdf', srp));
      break;
    }

    case 'switch_dc': {
      ctx.network.cfg.dc = msg.payload;
      notify('authorization_updated', { dc: msg.payload, user: ctx.network.dc.getUserID() || 0 });
      break;
    }

    default:
  }
}

/**
 * Service Worker Installation
 */
ctx.addEventListener('install', (event: ExtendableEvent) => {
  log('service worker is installing');


  event.waitUntil(
    Promise.all([
      initNetwork(),
      caches.open('files').then((cache) => ctx.cache = cache),
    ]),
  );
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
  if (!ctx.network) initNetwork().then(() => processWindowMessage(event.data as WindowMessage, event.source));
  else processWindowMessage(event.data as WindowMessage, event.source);
};

/**
 * File Part Request
 */
function getFilePartRequest(location: InputFileLocation, offset: number, limit: number,
  options: DownloadOptions, ready: (buf: ArrayBuffer, mime?: string) => void) {
  if (!ctx.network) return;

  const params = { location, offset, limit, precise: !!options.precise };
  const headers = { dc: options.dc_id || ctx.network.cfg.dc, thread: 2 };

  ctx.network.call('upload.getFile', params, headers, (err, result) => {
    // redirect to another dc
    if (err && err.message && err.message.indexOf('FILE_MIGRATE_') > -1) {
      getFilePartRequest(location, offset, limit, { ...options, dc_id: +err.message.slice(-1) }, ready);
      return;
    }

    // todo handling errors
    if (err || !result || result._ === 'upload.fileCdnRedirect') {
      throw new Error(`Error while donwloading file: ${JSON.stringify(err)}`);
      return;
    }

    if (!err && result) ready(result.bytes, typeToMime(result.type));
  });
}

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
        ctx.cache.match(url).then((cached) => {
          if (cached) return cached;

          const info = files.get(url);
          if (!info) return NegativeResponse;

          return new Promise((resolve) => {
            info.events.push(resolve);
            resolveDownload(info, ctx.cache, getFilePartRequest);
          });
        }),
      );
      break;

    case 'stream': {
      const range = event.request.headers.get('Range');
      const [offset, end] = parseRange(range || '');
      const info = files.get(url);

      if (!info) event.respondWith(NegativeResponse);
      else {
        event.respondWith(new Promise((resolve) => {
          resolveRangeRequest(info, offset, end, resolve, getFilePartRequest);
        }));
      }
      break;
    }

    default:
      event.respondWith(fetch(event.request.url));
  }


  // case 'profiles':
  //   log('profiles promise', url);
  //   notify('requested', { url });

  //   return new Promise((resolve) => {
  //     if (!requests[url]) requests[url] = [];
  //     requests[url].push(resolve);
  //   });

  // case 'stream': {
  //   log('get range', url, event.request.headers.get('Range'));

  //   const range = event.request.headers.get('Range');
  //   const [offset, end] = parseRange(range || '');

  //   notify('stream_range', { url, offset: alignOffset(offset, 1024 * 512), end });

  //   return new Promise((resolve) => {
  //     if (!requests[url]) requests[url] = [];
  //     requests[url].push(resolve);
  //   });
  // }
});
