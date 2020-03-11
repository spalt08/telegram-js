import { WorkerRequestID, WorkerRequestCallback, WorkerNotificationCallback, WorkerMessageIncoming, WorkerRequestType,
  WorkerNotificationType, WorkerRequestPayloadMap, WorkerTaskPayloadMap } from './types';

// Worker is environment dependent
let worker: Worker;
if (process.env.NODE_ENV === 'test') {
  const MockWorker = require('./workers/mock.worker'); // eslint-disable-line
  worker = new MockWorker();
} else {
  const ClientWorker = require('./workers/worker'); // eslint-disable-line
  worker = new ClientWorker();
}

// Request resolvers
const requests: Record<WorkerRequestID, WorkerRequestCallback<WorkerRequestType>> = {};

// notification listeners
const listeners: Record<WorkerNotificationType, WorkerNotificationCallback<WorkerNotificationType>[]> = {} as Record<string, any>;

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
