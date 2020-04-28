/* eslint-disable no-restricted-globals */
import { ServiceWorkerNotificationType, ServiceWorkerNotificationMap, ServiceWorkerTask } from 'client/types';

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

      notify('requested', { url }, true);

      switch (domain) {
        case 'profiles':
          return new Promise((resolve) => {
            if (!requests[url]) requests[url] = [];
            requests[url].push(resolve);
          });

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

  const { type, payload } = event.data as ServiceWorkerTask;

  switch (type) {
    case 'completed':
      releaseRequests(payload.url);
      break;

    default:
  }
};
