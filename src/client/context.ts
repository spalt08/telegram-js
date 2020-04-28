/* eslint-disable compat/compat */
import runtime from 'serviceworker-webpack-plugin/lib/runtime';
import { SERVICE_WORKER_SCOPE } from 'const';
import { WorkerRequestID, WorkerRequestCallback, WorkerNotificationCallback, WorkerMessageIncoming, WorkerRequestType,
  WorkerNotificationType, WorkerRequestPayloadMap, WorkerTaskPayloadMap, ServiceWorkerTaskPayloadMap, ServiceWorkerNotification,
  ServiceWorkerNotificationCallback, ServiceWorkerNotificationType } from './types';

// Worker is environment dependent
let worker: Worker;
if (process.env.NODE_ENV === 'test') {
  worker = new Worker('./workers/mock', { type: 'module' });
} else {
  worker = new Worker('./workers/worker', { type: 'module' });
}

// Request resolvers
const requests: Record<WorkerRequestID, WorkerRequestCallback<WorkerRequestType>> = {};

// notification listeners
const listeners: Record<WorkerNotificationType, WorkerNotificationCallback<WorkerNotificationType>[]> = {} as Record<string, any>;
const serviceListeners = {} as Record<ServiceWorkerNotificationType, ServiceWorkerNotificationCallback<ServiceWorkerNotificationType>[]>;

// Wrapper for posting tasks to worker
export function task<K extends keyof WorkerTaskPayloadMap>(type: K, payload: WorkerTaskPayloadMap[K]) {
  worker.postMessage({ type, payload });
}

// Wrapper for posting requests to worker
export function request<K extends WorkerRequestType>(type: K, payload: WorkerRequestPayloadMap[K], cb: WorkerRequestCallback<K>) {
  const id = type + Date.now().toString() + Math.random() * 1000;
  worker.postMessage({ id, type, payload });
  requests[id] = cb;
}

// Wrapper for listening messages
export function listenMessage<K extends WorkerNotificationType>(type: K, cb: WorkerNotificationCallback<K>) {
  if (!listeners[type]) listeners[type] = [];
  listeners[type].push(cb);
}

/**
 * Message resolver
 */
worker.onmessage = (event: MessageEvent) => {
  if (!event.data || !event.data.type) return;

  const data = event.data as WorkerMessageIncoming;

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
};

/**
 * Service worker
 */
if ('serviceWorker' in navigator) {
  runtime.register({ scope: SERVICE_WORKER_SCOPE }).then(
    (registration: ServiceWorkerRegistration) => {
      console.log('Service Worker Loaded With Scope:', registration.scope, registration.active);
    },
    (err: any) => { throw new Error(`ServiceWorker registration failed: ${err})`); },
  );
}

navigator.serviceWorker.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;
  const { type, payload } = event.data as ServiceWorkerNotification;
  for (let i = 0; i < serviceListeners[type].length; i += 1) serviceListeners[type][i](payload);
});

// Wrapper for listening messages
export function listenServiceMessage<K extends ServiceWorkerNotificationType>(type: K, cb: ServiceWorkerNotificationCallback<K>) {
  if (!serviceListeners[type]) serviceListeners[type] = [];
  serviceListeners[type].push(cb);
}

// Wrapper for posting tasks to service worker
export function serviceTask<K extends keyof ServiceWorkerTaskPayloadMap>(type: K, payload: ServiceWorkerTaskPayloadMap[K]) {
  if (!navigator.serviceWorker.controller) throw new Error('Service Worker is Undefined');

  navigator.serviceWorker.controller.postMessage({ type, payload });
}
