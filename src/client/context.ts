/* eslint-disable compat/compat, import/no-extraneous-dependencies, import/no-webpack-loader-syntax */
import runtime from 'serviceworker-webpack-plugin/lib/runtime';
import { SERVICE_WORKER_SCOPE } from 'const';
import Worker from 'worker-loader!./workers/worker';
import CanvasKitWorker from 'worker-loader!./workers/canvaskit.worker';
import { ServiceRequestID, ServiceRequestCallback, WindowMessage, NotificationType, ServiceNotificationCallback, TaskPayloadMap,
  RequestType, RequestPayloadMap, ServiceRequest, ServiceMessage, ServiceTask, CanvasWorkerResponse } from './types';

// Request resolvers
const requests: Record<ServiceRequestID, ServiceRequestCallback<any>> = {};
let pending: WindowMessage[] = [];

// notification listeners
const listeners: Record<NotificationType, ServiceNotificationCallback<NotificationType>[]> = {} as any;

// Wrapper for posting tasks to worker
export function task<K extends keyof TaskPayloadMap>(type: K, payload: TaskPayloadMap[K]) {
  if (!navigator.serviceWorker.controller) pending.push({ type, payload } as WindowMessage);
  else navigator.serviceWorker.controller.postMessage({ type, payload });
}

// Wrapper for posting requests to worker
export function request<K extends RequestType>(type: K, payload: RequestPayloadMap[K], cb: ServiceRequestCallback<K>) {
  const id = type + Date.now().toString() + Math.random() * 1000;

  if (!navigator.serviceWorker.controller) pending.push({ id, type, payload } as ServiceRequest);
  else navigator.serviceWorker.controller.postMessage({ id, type, payload });

  requests[id] = cb;
}

// Wrapper for listening messages
export function listenMessage<K extends NotificationType>(type: K, cb: ServiceNotificationCallback<K>) {
  if (!listeners[type]) listeners[type] = [];
  listeners[type].push(cb);
}

let worker: Worker;
function initWorker() {
  worker = new Worker();
  worker.addEventListener('message', (event) => {
    const message = event.data as ServiceTask;
    task(message.type, message.payload);
  });
}

/**
 * Message resolver
 */
navigator.serviceWorker.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;

  const data = event.data as ServiceMessage;

  // proxy to worker
  if ('worker' in data) {
    if (!worker) initWorker();
    worker.postMessage(data);
    return;
  }

  // notification
  if (data.id === undefined) {
    const { type, payload } = data;
    for (let i = 0; i < listeners[type].length; i += 1) listeners[type][i](payload);

  // response
  } else {
    const { id, payload } = data;
    requests[id](payload);
    delete requests[id];
  }
});

function resendPending() {
  if (navigator.serviceWorker.controller) {
    for (let i = 0; i < pending.length; i++) navigator.serviceWorker.controller.postMessage(pending[i]);
    pending = [];
  }
}

/**
 * Service worker
 */
runtime.register({ scope: SERVICE_WORKER_SCOPE });

navigator.serviceWorker.ready.then((registration) => {
  console.log('Service Worker Loaded With Scope:', registration.scope, navigator.serviceWorker.controller);
  task('get_status', {});
  resendPending();
});

navigator.serviceWorker.oncontrollerchange = resendPending;

/**
 * Offscreen Rendering for Stickers
 */
let canvaskitWorker: CanvasKitWorker;
export function getCanvasKitWorker(onMessage: (message: CanvasWorkerResponse) => void) {
  if (canvaskitWorker) return canvaskitWorker;

  canvaskitWorker = new CanvasKitWorker();
  canvaskitWorker.addEventListener('message', (event) => {
    onMessage(event.data as CanvasWorkerResponse);
  });

  return canvaskitWorker;
}
