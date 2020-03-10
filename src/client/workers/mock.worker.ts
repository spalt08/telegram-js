/* eslint-disable no-restricted-globals */
import { WorkerMessageOutcoming, WorkerResponseType, WorkerResponsePayloadMap, WorkerNotificationType,
  WorkerNotificationPayloadMap } from 'client/types';
import { locationToString } from 'helpers/files';
import { mockResponse, getMockedFile } from './mocks/response';
import { loadTGS } from './worker.utils';

// Worker context
const ctx: Worker = self as any;

/**
 * Resolve worker task
 */
function respond<K extends WorkerResponseType>(id: string, type: K, payload: WorkerResponsePayloadMap[K]) {
  // eslint-disable-next-line no-console
  ctx.postMessage({ id, type, payload });
}

/**
 * Send notification
 */
function notify<K extends WorkerNotificationType>(type: K, payload: WorkerNotificationPayloadMap[K]) {
  ctx.postMessage({ type, payload });
}

/**
 * Handle incoming message
 */
ctx.onmessage = (event) => {
  if (!event.data) return;

  const message = event.data as WorkerMessageOutcoming;

  switch (message.type) {
    case 'call': {
      const { method, params, headers } = message.payload;
      const [error, result, delay] = mockResponse(method as any, params, headers);
      setTimeout(() => respond(message.id, 'rpc_result', { error, result }), delay);
      break;
    }

    case 'download': {
      const { id, location } = message.payload;
      const [delay, url] = getMockedFile(locationToString(location));
      setTimeout(() => notify('download_ready', { id, url }), delay);
      break;
    }

    case 'load_tgs': {
      const { payload, id } = message;
      loadTGS(payload, (json) => respond(id, 'tgs_loaded', json));
      break;
    }

    default:
  }
};


/* For jest testing */
export default class WorkerMock {
  onmessage: undefined | ((event: MessageEvent) => void);

  // eslint-disable-next-line
  constructor() {}
  postMessage(_msg: any): void {}
}
