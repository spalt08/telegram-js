/* eslint-disable no-restricted-globals */
import { DownloadOptions, WindowMessage } from 'client/types';
import { CLIENT_CONFIG } from 'const/api';
import { typeToMime } from 'helpers/files';
import { parseRange } from 'helpers/stream';
import { Client as NetworkHandler, InputFileLocation } from 'mtproto-js';
import { createNotification, respond } from './extensions/context';
import { load, save } from './extensions/db';
import { fetchRequest } from './extensions/files';
import { fetchStreamRequest } from './extensions/stream';
import { fetchCachedSize, fetchLocation, fetchSrippedSize, fetchTGS } from './extensions/utils';

type ExtendedWorkerScope = {
  cache: Cache,
  network: NetworkHandler,
};

const ctx = self as any as ServiceWorkerGlobalScope & ExtendedWorkerScope;
const notify = createNotification(ctx.clients);

const { log } = console;

// CLIENT_CONFIG.test = true;
const dbkey = CLIENT_CONFIG.test ? 'metatest' : 'meta';
const initNetwork = () => load(dbkey).then((meta: any) => {
  if (ctx.network) return;

  ctx.network = new NetworkHandler({ ...CLIENT_CONFIG, meta, dc: meta.baseDC });

  ctx.network.on('metaChanged', (newMeta) => save(dbkey, newMeta));
  ctx.network.on('metaChanged', (state) => notify('authorization_updated', { dc: state.baseDC, user: state.userID || 0 }));
  ctx.network.on('networkChanged', (state) => notify('network_updated', state));
  ctx.network.updates.on((update) => notify('update', update));
  ctx.network.updates.fetch();
});

const initCache = () => caches.open('files').then((cache) => ctx.cache = cache);

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
      throw new Error(`Error while downloading file: ${JSON.stringify(err)}`);
      return;
    }

    if (!err && result) ready(result.bytes, typeToMime(result.type));
  });
}

function fileProgress(url: string, downloaded: number, total: number) {
  notify('file_progress', { url, downloaded, total });
}

/**
 * Window Message Processing
 */
function processWindowMessage(msg: WindowMessage, source: Client | MessagePort | ServiceWorker | null = null) {
  if (msg.type !== 'location') log('message', msg.type);

  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'call': {
      const { id, payload: { method, params, headers } } = msg;
      ctx.network.call(method, params, headers, (error, result) => source && respond(source, id, 'rpc_result', { error, result }));
      break;
    }

    case 'location': {
      const { url, location, options } = msg.payload;
      fetchLocation(url, location, options, getFilePartRequest, ctx.cache, fileProgress);
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
      initCache(),
    ]),
  );
});

/**
 * Service Worker Activation
 */
ctx.addEventListener('activate', (event) => {
  log('service worker activating', ctx);

  if (!ctx.network) initNetwork();
  if (!ctx.cache) initCache();

  event.waitUntil(ctx.clients.claim());
});

/**
 * Listen Messages
 */
ctx.onmessage = (event) => {
  if (!ctx.cache) initCache();
  if (!ctx.network) initNetwork().then(() => processWindowMessage(event.data as WindowMessage, event.source));

  else processWindowMessage(event.data as WindowMessage, event.source);
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
        ctx.cache.match(url).then((cached) => {
          if (cached) return cached;

          return new Promise((resolve) => {
            fetchRequest(url, resolve, getFilePartRequest, ctx.cache, fileProgress);
          });
        }),
      );
      break;

    case 'stream': {
      const [offset, end] = parseRange(event.request.headers.get('Range') || '');

      log('stream', url, offset, end);

      event.respondWith(new Promise((resolve) => {
        fetchStreamRequest(url, offset, end, resolve, getFilePartRequest);
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
      if (url && url.endsWith('.tgs')) event.respondWith(fetchTGS(url));
      else event.respondWith(fetch(event.request.url));
  }
});
