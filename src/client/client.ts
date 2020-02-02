import ClientWorker from './worker';
import { WorkerMessage } from './types';
import { InputFileLocation } from '../cache/types';

/**
 * Request error
 */
export type ClientError = {
  type: 'rpc' | 'network' | 'transport' | 'internal';
  code: number,
  message?: string,
};

/**
 * Worker callbacks
 */
type RequestResolver = (err: ClientError | null, res?: any) => void;
type UpdateResolver = (res?: any) => void;
type AnyResolver = (...payload: unknown[]) => void;

/**
 * Vars
 */
const worker = new ClientWorker();
const requests: Record<string, RequestResolver> = {};
const quene: Record<string, AnyResolver> = {};
const updates: Record<string, UpdateResolver[]> = {};
const clientDebug = localStorage.getItem('debugmt') || false;
const dc = +localStorage.getItem('dc')! || 2;
const svc = {
  test: false,
  baseDC: dc,
  meta: JSON.parse(localStorage.getItem('meta') || '{}'),
};

/**
 * Init client
 */
worker.postMessage({
  id: '',
  type: 'init',
  payload: {
    dc,
    test: svc.test,
    debug: clientDebug,
    meta: svc.meta,
  },
} as WorkerMessage);


/**
 * Make RPC API request
 */
function call(method: string, data: Record<string, any>, cb?: RequestResolver): void;
function call(method: string, data: Record<string, any>, headers: Record<string, any>, cb?: RequestResolver): void;
function call(method: string, ...args: unknown[]): void {
  const id = method + Date.now().toString(16);

  let params: Record<string, any> = {};
  let headers: Record<string, any> = {};
  let cb: RequestResolver | undefined;

  if (typeof args[0] === 'object') params = args[0] as Record<string, any>;
  if (args.length > 1 && typeof args[1] === 'object') headers = args[1] as Record<string, any>;
  if (args.length > 1 && typeof args[1] === 'function') cb = args[1] as RequestResolver;
  if (args.length > 2 && typeof args[2] === 'function') cb = args[2] as RequestResolver;

  worker.postMessage({
    id,
    type: 'call',
    payload: { method, params, headers },
  } as WorkerMessage);

  if (cb) requests[id] = cb;
}

/**
 * Any task wrapper
 */
function task(type: WorkerMessage['type'], payload: any, cb?: AnyResolver) {
  const id = type + Date.now().toString();
  worker.postMessage({ id, type, payload } as WorkerMessage);
  if (cb) quene[id] = cb;
}

/**
 * Subscribe RPC update
 */
function on(predicate: string, cb: UpdateResolver) {
  if (!updates[predicate]) {
    updates[predicate] = [];

    worker.postMessage({
      id: predicate,
      type: 'update',
      payload: {},
    } as WorkerMessage);
  }

  updates[predicate].push(cb);
}

/**
 * Message resolver
 */
worker.onmessage = (event: MessageEvent) => {
  if (!event.data || !event.data.type) return;

  const data = event.data as WorkerMessage;

  switch (data.type) {
    case 'call':
      requests[event.data.id](data.payload.err, data.payload.result);
      delete requests[event.data.id];
      break;

    case 'update':
      for (let i = 0; i < updates[event.data.id].length; i += 1) {
        updates[event.data.id][i](data.payload);
      }
      break;

    case 'meta':
      svc.meta = data.payload;
      break;

    default:
      if (quene[event.data.id]) {
        quene[event.data.id](data.payload);
        delete quene[event.data.id];
      }
  }
};

// Returns id of authorized user
function getUserID(): number {
  return svc.meta[dc].userID as number;
}

// Returns base datacenter
function getBaseDC(): number {
  return dc;
}

// Switches base datacenter
function setBaseDC(dc_id: number) {
  svc.baseDC = dc_id;
  localStorage.setItem('dc', dc_id.toString());

  worker.postMessage({
    id: '',
    type: 'switch_dc',
    payload: dc_id,
  } as WorkerMessage);
}

// Returns result of kdf hash algo
function getPasswordKdfAsync(algo: any, password: string, cb: AnyResolver) {
  task('password_kdf', { algo, password }, cb);
}

function authorize(dc_id: number, cb?: AnyResolver) {
  task('authorize', dc_id, cb);
}

function getFile(location: InputFileLocation, cb: AnyResolver, dc_id?: number, mime?: string) {
  task('get_file', { location, dc_id, mime }, cb);
}

const client = {
  svc,
  call,
  updates: {
    on,
  },
  getUserID,
  getBaseDC,
  setBaseDC,
  getPasswordKdfAsync,
  authorize,
  getFile,
  storage: window.localStorage,
};

/**
 * Cache client meta after page closing
 */
window.addEventListener('beforeunload', () => {
  client.storage.setItem('meta', JSON.stringify(svc.meta));
});

// Dev only
if (process.env.NODE_ENV === 'development') {
  (window as any).client = client;
}

export default client;
