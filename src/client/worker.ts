/* eslint-disable no-restricted-globals */

import { Client, TypeLanguage, ClientError, TLConstructor } from 'mtproto-js';
import { API_ID, API_HASH, APP_VERSION } from '../const/api';
import Layer105 from './layer105.json';
import { WorkerMessage } from './types';


/**
 * Vars
 */
let client: Client | undefined;

// Worker context
const ctx: Worker = self as any;

// Pending tasks
const pending: WorkerMessage[] = [];

/**
 * Resolve worker task
 */
function resolve(id: string, type: string, payload: any) {
  ctx.postMessage({ id, type, payload } as WorkerMessage);
}

/**
 * Resolve update
 */
function resolveUpdate(id: string, update: TLConstructor) {
  ctx.postMessage({ id, type: 'update', payload: update.json() } as WorkerMessage);
}

/**
 * Process worker message
 */
function process(message: WorkerMessage) {
  const { payload, type, id } = message;

  if (type === 'init') {
    const tl = new TypeLanguage(Layer105);
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
      ...payload,
    });

    // Broadcast meta changes
    client.on('metaChanged', (newMeta: any) => {
      console.log('metaChanged', newMeta);
      resolve('', 'meta', newMeta);
    });

    if (pending.length > 0) {
      for (let i = 0; i < pending.length; i += 1) {
        const msg = pending.shift();
        if (msg) process(msg);
      }
    }
  }

  if (!client) {
    pending.push(message);
    return;
  }

  switch (type) {
    case 'init': {
      break;
    }

    case 'call': {
      client.call(
        payload.method,
        payload.params,
        payload.headers,
        (err: ClientError, result?: TLConstructor) => resolve(id, type, { err, result: result && result.json() }),
      );

      break;
    }

    case 'update': {
      client.updates.on(id, (update) => resolveUpdate(id, update));
      break;
    }

    case 'password_kdf': {
      client.getPasswordKdfAsync(payload.algo, payload.password, (srp_hash: any) => {
        resolve(id, type, srp_hash);
      });
      break;
    }

    case 'switch_dc': {
      client.cfg.dc = +payload;
      break;
    }

    case 'authorize': {
      client.authorize(payload, (err, key) => {
        resolve(id, type, err || key);
      });
      break;
    }

    default: {
      throw new Error(`Unknown task: ${type}`);
    }
  }
}


// Respond to message from parent thread
ctx.addEventListener('message', (event) => {
  if (event.data && event.data.type) {
    process(event.data);
  }
});

/* For jest testing */
export default class WorkerMock {
  onmessage: undefined | ((event: MessageEvent) => void);

  // eslint-disable-next-line
  constructor() {}

  // eslint-disable-next-line
  postMessage(_msg: any): void {};
}
