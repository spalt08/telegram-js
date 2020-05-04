/* eslint-disable compat/compat */
import runtime from 'serviceworker-webpack-plugin/lib/runtime';
import { SERVICE_WORKER_SCOPE } from 'const';
import { ServiceRequestID, ServiceRequestCallback, WindowMessage, NotificationType, ServiceNotificationCallback, TaskPayloadMap,
  RequestType, RequestPayloadMap, ServiceRequest, ServiceMessage } from './types';

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

/**
 * Message resolver
 */
navigator.serviceWorker.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;

  const data = event.data as ServiceMessage;

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

/**
 * Service worker
 */
runtime.register({ scope: SERVICE_WORKER_SCOPE });
navigator.serviceWorker.ready.then((registration) => {
  console.log('Service Worker Loaded With Scope:', registration.scope, navigator.serviceWorker.controller);
  if (navigator.serviceWorker.controller) {
    for (let i = 0; i < pending.length; i++) navigator.serviceWorker.controller.postMessage(pending[i]);
    pending = [];
  }
});
