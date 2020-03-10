/* eslint-disable no-restricted-globals */
import { Client, TypeLanguage } from 'packages/mtproto-js';
import { API_ID, API_HASH, APP_VERSION } from 'const/api';
import { WorkerMessageOutcoming, WorkerResponseType, WorkerResponsePayloadMap, WorkerNotificationType,
  WorkerNotificationPayloadMap } from 'client/types';
import schema from './layer105.json';
import { downloadFile, loadTGS, uploadFile } from './worker.media';

/**
 * Vars
 */
let client: Client | undefined;

// Worker context
const ctx: Worker = self as any;

// Pending messages
const pending: WorkerMessageOutcoming[] = [];

/**
 * Respond to request
 */
function respond<K extends WorkerResponseType>(id: string, type: K, payload: WorkerResponsePayloadMap[K]) {
  ctx.postMessage({ id, type, payload });
}

/**
 * Send notification
 */
function notify<K extends WorkerNotificationType>(type: K, payload: WorkerNotificationPayloadMap[K]) {
  ctx.postMessage({ type, payload });
}

/**
 * Process worker message
 */
function processMessage(msg: WorkerMessageOutcoming) {
  if (!client) {
    pending.push(msg);
    return;
  }
  switch (msg.type) {
    case 'window_event': {
      // todo: check support
      self.dispatchEvent(new Event(msg.payload));
      break;
    }

    case 'call': {
      const { id, payload: { method, params, headers } } = msg;
      client.call(method, params, headers, (error, result) => respond(id, 'rpc_result', { error, result: result?.json() }));
      break;
    }

    case 'password_kdf': {
      const { id, payload: { algo, password } } = msg;
      client.getPasswordKdfAsync(algo, password, (srp: any) => respond(id, 'password_kdf', srp));
      break;
    }

    case 'switch_dc': {
      client.cfg.dc = msg.payload;
      break;
    }

    case 'authorize': {
      const { id, payload } = msg;
      client.authorize(payload, (key) => respond(id, 'authorization_complete', key));
      break;
    }

    case 'load_tgs': {
      loadTGS(msg.payload, (json) => respond(msg.id, 'tgs_loaded', json));
      break;
    }

    case 'upload': {
      const { id, file } = msg.payload;
      uploadFile(client, id, file, notify);
      break;
    }

    case 'download': {
      const { id, location, options } = msg.payload;
      downloadFile(client, id, location, options, notify);
      break;
    }

    case 'listen_update': {
      client.updates.on(msg.payload, (update) => notify('update', update));
      break;
    }

    default: {
      throw new Error(`Unknown task: ${msg.type}`);
    }
  }
}

ctx.onmessage = (event) => {
  if (!event.data) return;

  const message = event.data as WorkerMessageOutcoming;

  // init client instance with config
  if (!client && message.type === 'init') {
    const tl = new TypeLanguage(schema as any);
    client = new Client(tl, {
      ssl: true,
      protocol: 'intermediate',
      transport: 'websocket',

      APILayer: 105,
      APIID: API_ID,
      APIHash: API_HASH,

      deviceModel: 'test',
      systemVersion: 'test',
      appVersion: APP_VERSION,
      langCode: 'en',
      ...message.payload,
    });

    console.log(client);
    // Broadcast meta changes
    client.on('metaChanged', (newMeta) => { notify('meta_updated', newMeta); });

    // Broadcast network changes
    client.on('networkChanged', (state) => { notify('network_updated', state); });

    // Start receive updates
    client.updates.fetch();

    // Process pending messages
    while (pending.length > 0) processMessage(pending.shift()!);

  // process message
  } else {
    processMessage(message);
  }
};
