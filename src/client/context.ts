/* eslint-disable compat/compat, import/no-extraneous-dependencies, import/no-webpack-loader-syntax */
import runtime from 'serviceworker-webpack-plugin/lib/runtime';
import { SERVICE_WORKER_SCOPE } from 'const';
import EncoderWorker from 'worker-loader!./workers/encoder.worker';
import CanvasWorker from 'worker-loader!./workers/canvas.worker';
import { ServiceRequestID, ServiceRequestCallback, WindowMessage, NotificationType, ServiceNotificationCallback, TaskPayloadMap,
  RequestType, RequestPayloadMap, ServiceRequest, ServiceMessage, ServiceTask, ServiceNotification } from './types';

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
 * Encoder Worker for Safari
 */
let encoderWorker: EncoderWorker;
export function getEncoderWorker() {
  if (encoderWorker) return encoderWorker;

  encoderWorker = new EncoderWorker();
  encoderWorker.addEventListener('message', (event) => {
    const message = event.data as ServiceTask;
    task(message.type, message.payload);
  });

  return encoderWorker;
}

/**
 * Offscreen Rendering for Chrome
 */
let canvasWorker: CanvasWorker;
export function getCanvasWorker() {
  if (canvasWorker) return canvasWorker;

  canvasWorker = new CanvasWorker();
  canvasWorker.addEventListener('message', (event) => {
    const message = event.data as ServiceNotification;
    for (let i = 0; i < listeners[message.type].length; i += 1) listeners[message.type][i](message.payload);
  });

  return canvasWorker;
}


/**
 * Message resolver
 */
navigator.serviceWorker.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;

  const data = event.data as ServiceMessage;

  // proxy to worker
  if ('worker' in data) {
    getEncoderWorker().postMessage(data);
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
  resendPending();
});

navigator.serviceWorker.oncontrollerchange = resendPending;
