import { NotificationType, NotificationPayloadMap, ResponseType, ResponsePayloadMap } from 'client/types';

/**
 * Broadcast Notification Fabric
 */
export function createNotification(clients: Clients) {
  return <K extends NotificationType>(type: K, payload: NotificationPayloadMap[K]) => {
    clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(
      (listeners) => listeners.forEach((client) => client.postMessage({ type, payload })),
    );
  };
}

/**
 * Respond to request
 */
export function respond<K extends ResponseType>(client: Client | ServiceWorker | MessagePort, id: string, type: K,
  payload: ResponsePayloadMap[K]) {
  client.postMessage({ id, type, payload }, []);
}
