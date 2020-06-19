/* eslint-disable no-restricted-globals */
import { DownloadOptions, WindowMessage } from 'client/types';
import { CLIENT_CONFIG } from 'const/api';
import { typeToMime } from 'helpers/files';
import { parseRange } from 'helpers/stream';
import { Client as NetworkHandler, InputFileLocation, MethodDeclMap } from 'mtproto-js';
import { notify, respond } from './extensions/context';
import { load, save } from './extensions/db';
import { fetchRequest, respondDownload, download, blobLoop } from './extensions/files';
import { fetchStreamRequest } from './extensions/stream';
import { fetchLocation, fetchTGS, getThumb, fetchThumb } from './extensions/utils';
import { uploadFile } from './extensions/uploads';

type ExtendedWorkerScope = {
  cache: Cache,
  network: NetworkHandler,
};

const ctx = self as any as ServiceWorkerGlobalScope & ExtendedWorkerScope;

const { log } = console;

// CLIENT_CONFIG.test = true;
const dbkey = CLIENT_CONFIG.test ? 'metatest' : 'meta';
const initNetwork = () => load(dbkey).then((meta: any) => {
  if (ctx.network) return;

  ctx.network = new NetworkHandler({ ...CLIENT_CONFIG, meta, dc: meta.baseDC, autoConnect: true });

  ctx.network.on('metaChanged', (newMeta) => save(dbkey, newMeta));
  ctx.network.on('metaChanged', (state) => notify('authorization_updated', { dc: state.baseDC, user: state.userID || 0 }));
  ctx.network.on('networkChanged', (state) => notify('network_updated', state));
  ctx.network.updates.on((update) => notify('update', update));
  ctx.network.updates.fetch();

  // for (let i = 1; i <= 5; i++) ctx.network.authorize(i);
});

const initCache = () => new Promise((resolve) => {
  if (ctx.cache) resolve(ctx.cache);
  else if ('caches' in self) caches.open('files').then((cache) => resolve(ctx.cache = cache));
});

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

    // wait
    if (err && err.message && err.message.indexOf('FLOOD_WAIT_') > -1) {
      const wait = +err.message.replace('FLOOD_WAIT_', '') + 0.3;
      console.log('waiting', wait * 1000);
      setTimeout(() => getFilePartRequest(location, offset, limit, options, ready), wait * 1000);
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

/**
 * Upload Part Request
 */
function uploadFilePartRequest(file_id: string, file_part: number, file_total_parts: number, bytes: ArrayBuffer, big: boolean = false,
  ready: () => void) {
  let payload;
  let method: 'upload.saveFilePart' | 'upload.saveBigFilePart';

  if (big) {
    method = 'upload.saveBigFilePart';
    payload = { file_id, file_part, file_total_parts, bytes } as MethodDeclMap['upload.saveBigFilePart']['req'];
  } else {
    method = 'upload.saveFilePart';
    payload = { file_id, file_part, bytes } as MethodDeclMap['upload.saveFilePart']['req'];
  }

  ctx.network.call(method, payload, { thread: 2 }, (error, result) => {
    if (error || !result) throw new Error(`Error while uploadig file: ${JSON.stringify(error)}`);
    else ready();
  });
}

function fileProgress(url: string, downloaded: number, total: number) {
  notify('file_progress', { url, downloaded, total });
}

/**
 * Window Message Processing
 */
function processWindowMessage(msg: WindowMessage, source: Client | MessagePort | ServiceWorker | null = null) {
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'call': {
      const { id, payload: { method, params, headers } } = msg;
      log('call', method);
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

    case 'upload': {
      const { id, file } = msg.payload;
      uploadFile(id, file, uploadFilePartRequest, notify);
      break;
    }

    case 'webp_loaded': {
      const { url, blob } = msg.payload;
      respondDownload(url, new Response(blob), ctx.cache);
      break;
    }

    case 'thumb': {
      const { url, bytes } = msg.payload;
      fetchThumb(url, bytes);
      break;
    }

    case 'download': {
      const { id, payload: { url, location, options } } = msg;
      blobLoop(url, location, options, getFilePartRequest, (blob) => {
        if (source) respond(source, id, 'download_prepared', { url: URL.createObjectURL(blob) });
      }, fileProgress);
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

  initCache();

  event.waitUntil(
    initNetwork(),
  );
});

/**
 * Service Worker Activation
 */
ctx.addEventListener('activate', (event) => {
  log('service worker activating', ctx);

  if (!ctx.cache) initCache();
  if (!ctx.network) initNetwork();

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

function timeout(delay: number): Promise<Response> {
  return new Promise(((resolve) => {
    setTimeout(() => {
      resolve(new Response('', {
        status: 408,
        statusText: 'Request timed out.',
      }));
    }, delay);
  }));
}

/**
 * Fetch requests
 */
ctx.addEventListener('fetch', (event: FetchEvent): void => {
  if (!ctx.network) initNetwork();

  initCache().then(() => {
    const [, url, scope] = /http[:s]+\/\/.*?(\/(.*?)\/.*$)/.exec(event.request.url) || [];

    switch (scope) {
      case 'documents':
      case 'photos':
      case 'profiles':
        // direct download
        if (event.request.method === 'POST') {
          event.respondWith(// download(url, 'unknown file.txt', getFilePartRequest));
            event.request.text()
              .then((text) => {
                const [, filename] = text.split('=');
                return download(url, filename ? filename.toString() : 'unknown file', getFilePartRequest);
              }),
          );

        // inline
        } else {
          event.respondWith(
            ctx.cache.match(url).then((cached) => {
              if (cached) return cached;

              return Promise.race([
                timeout(45 * 1000), // safari fix
                new Promise<Response>((resolve) => {
                  fetchRequest(url, resolve, getFilePartRequest, ctx.cache, fileProgress);
                }),
              ]);
            }),
          );
        }
        break;

      case 'stream': {
        const [offset, end] = parseRange(event.request.headers.get('Range') || '');

        log('stream', url, offset, end);

        event.respondWith(new Promise((resolve) => {
          fetchStreamRequest(url, offset, end, resolve, getFilePartRequest);
        }));
        break;
      }

      case 'stripped':
      case 'cached': {
        const bytes = getThumb(url) || null;
        event.respondWith(new Response(bytes, { headers: { 'Content-Type': 'image/jpg' } }));
        break;
      }

      default:
        if (url && url.endsWith('.tgs')) event.respondWith(fetchTGS(url));
        else event.respondWith(fetch(event.request.url));
    }
  });
});
