/* eslint-disable no-restricted-globals */
import { ServiceWorkerNotificationType, ServiceWorkerNotificationMap, ServiceWorkerTask } from 'client/types';
import { parseRange, alignOffset } from 'helpers/stream';

const ctx = self as any as ServiceWorkerGlobalScope;
const requests: Record<string, Array<(file: Response | undefined) => void>> = {};

/**
 * Caches
 */
let fileCache: Cache | undefined;

/**
 * Send notification
 */
function notify<K extends ServiceWorkerNotificationType>(type: K, payload: ServiceWorkerNotificationMap[K], single = false) {
  ctx.clients.matchAll({ includeUncontrolled: true }).then(
    (clients) => {
      clients[0].postMessage('test');
      if (clients.length > 0 && single) clients[0].postMessage({ type, payload });
      else clients.forEach((client) => client.postMessage({ type, payload }));
    },
  );
}

/**
 * Open caches
 */
ctx.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open('files').then((cache) => fileCache = cache),
  );
});

/**
 * Claim Clients
 */
ctx.addEventListener('activate', (event) => event.waitUntil(ctx.clients.claim()));

/**
 * Fetch requests
 */
ctx.addEventListener('fetch', (event: FetchEvent) => {
  if (!fileCache) return;

  const url = event.request.url.replace(/http.*?\/\/.*?\//, '/');
  const domain = url.split('/')[1];

  event.respondWith(
    fileCache.match(url).then((response) => {
      if (response) return response;

      switch (domain) {
        case 'profiles':
          notify('requested', { url }, true);

          return new Promise((resolve) => {
            if (!requests[url]) requests[url] = [];
            requests[url].push(resolve);
          });

        case 'stream': {
          console.log('get range', url, event.request.headers.get('Range'));

          const range = event.request.headers.get('Range');
          const [offset, end] = parseRange(range || '');

          notify('stream_range', { url, offset: alignOffset(offset, 1024 * 512), end });

          return new Promise((resolve) => {
            if (!requests[url]) requests[url] = [];
            requests[url].push(resolve);
          });
        }

        default:
          return fetch(url);
      }
    }),
  );


  // async () => {
  //   if (!fileCache) throw new Error('Missing File Cache');

  //   const cached = await fileCache.match(url);

  //   if (cached) return cached;

  //   notify('requested', { url });

  //   return new Response('test');
  // });
});

/**
 * Complete Pending Requests
 */
function releaseRequests(url: string) {
  if (!fileCache || !requests[url]) return;

  fileCache.match(url).then((response) => {
    for (let i = 0; i < requests[url].length; i++) requests[url][i](response);
  });
}

/**
 * Listen Messages
 */
ctx.onmessage = (event) => {
  if (!event || !event.data || !event.data.type) return;

  const msg = event.data as ServiceWorkerTask;

  switch (msg.type) {
    case 'completed':
      releaseRequests(msg.payload.url);
      break;

    case 'range': {
      const { url, offset, buffer, size } = msg.payload;
      let { end } = msg.payload;

      if (!requests[url]) return;

      if (end === size) end = size - 1;

      console.log('part response', url, `bytes ${offset}-${end}/${size || '*'}`);

      const response = new Response(
        buffer,
        {
          status: 206,
          statusText: 'Partial Content',
          headers: {
            'Accept-Ranges': 'bytes',
            'Content-Range': `bytes ${offset}-${end - 1}/${size || '*'}`,
            'Content-Length': `${end - offset - 1}`,
            'Content-Type': 'video/mp4',
          },
        },
      );

      for (let i = 0; i < requests[url].length; i++) requests[url][i](response);
      delete requests[url];

      break;
    }

    default:
  }
};
