/* eslint-disable no-restricted-globals */

import { Client, TypeLanguage, ClientError, TLConstructor } from 'mtproto-js';
import { API_ID, API_HASH, APP_VERSION } from '../const/api';
import { WorkerMessage } from './types';
import { UploadFile } from '../cache/types';
import { typeToMime, hexToBlob } from '../helpers/files';
import loadSchema from './schema';


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
 * File managers: getFile method
 */
function downloadFilePart(
  location: any, cb: (f: string) => void, dc: number = client!.cfg.dc, mime = '', offset = 0, limit = 1024 * 1024, parts = '',
) {
  if (!client) throw new Error('Client is undefined');

  client.call('upload.getFile', { location, offset, limit }, { dc }, (err, result) => {
    // redirect to another dc
    if (err && err.message && err.message.indexOf('FILE_MIGRATE_') > -1) {
      downloadFilePart(location, cb, +err.message.slice(-1), mime, offset, limit, parts);
      return;
    }

    // todo handling errors
    if (err) {
      console.log(err);
      return;
    }

    if (!err && result) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      processFilePart(location, result.json(), mime, dc, offset, limit, parts, cb);
    }
  });
}

/**
 * File part processor
 */
function processFilePart(
  location: any, file: UploadFile, imime: string, dc: number, offset: number, limit: number, parts: string, cb: (url: string) => void,
) {
  // todo load parts
  if (file.bytes.length / 2 === limit) {
    downloadFilePart(location, cb, dc, imime, offset + 4096, limit, parts + file.bytes.slice(0, 4096 * 2));
    return;
  }

  const mime = imime || typeToMime(file.type);
  const blob = hexToBlob(file.bytes, mime);
  const url = (URL || webkitURL).createObjectURL(blob);

  cb(url);
}


/**
 * Process worker message
 */
function process(message: WorkerMessage) {
  const { payload, type, id } = message;

  if (type === 'init') {
    loadSchema((layer: any) => {
      const tl = new TypeLanguage(layer);
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
        resolve('', 'meta', newMeta);
      });

      client.updates.fetch();

      while (pending.length > 0) {
        process(pending.shift()!);
      }
    });
  }

  if (!client) {
    if (type !== 'init') pending.push(message);
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

    case 'get_file': {
      downloadFilePart(payload.location, (url) => {
        resolve(id, type, url);
      }, payload.dc, payload.mime);
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
