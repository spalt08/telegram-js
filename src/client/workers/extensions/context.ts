/* eslint-disable no-restricted-globals */
import { NotificationType, NotificationPayloadMap, ResponseType, ResponsePayloadMap } from 'client/types';

/**
 * Broadcast Notification
 */
export function notify<K extends NotificationType>(type: K, payload: NotificationPayloadMap[K]) {
  (self as any as ServiceWorkerGlobalScope)
    .clients
    .matchAll({ includeUncontrolled: false, type: 'window' })
    .then(
      (listeners) => listeners.forEach((client) => client.postMessage({ type, payload })),
    );
}

/**
 * Send Worker Task
 */
export function workerTask<K extends NotificationType>(type: K, payload: NotificationPayloadMap[K], transferable?: Transferable[]) {
  (self as any as ServiceWorkerGlobalScope)
    .clients
    .matchAll({ includeUncontrolled: false, type: 'window' })
    .then(
      (listeners) => listeners.length > 0 && listeners[listeners.length - 1].postMessage({ type, payload, worker: true }, transferable),
    );
}

/**
 * Respond to request
 */
export function respond<K extends ResponseType>(client: Client | ServiceWorker | MessagePort, id: string, type: K,
  payload: ResponsePayloadMap[K]) {
  client.postMessage({ id, type, payload }, []);
}
