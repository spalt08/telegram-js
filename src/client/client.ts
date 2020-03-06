import { InputCheckPasswordSRP, MethodDeclMap } from 'client/schema';
import { EventResolver, APICallResolver, APICallHeaders, APICallParams } from './types';
import { task, request, listenMessage } from './context';

// Environment & Setup
const debug = document.location.search.indexOf('debug') !== -1;
let dc = +localStorage.getItem('dc')! || 2;
let saveMetaField = 'meta';
let test = false;

if (document.location.search.indexOf('test') !== -1) {
  test = true;
  saveMetaField = 'metatest';
}

let meta = JSON.parse(localStorage.getItem(saveMetaField) || '{}');

/**
 * Update callbacks
 */
const listeners: Record<string, EventResolver[]> = {};

/**
 * Init client
 */
task('init', { dc, test, debug, meta });

/**
 * Pass online / offline events
 */
window.addEventListener('online', () => task('window_event', 'online'));
window.addEventListener('offline', () => task('window_event', 'offline'));

/**
 * Make RPC API request
 */
function call<K extends keyof MethodDeclMap>(method: K, params: APICallParams<K>, cb?: APICallResolver<K>): void;
function call<K extends keyof MethodDeclMap>(method: K, params: APICallParams<K>, headers: APICallHeaders, cb?: APICallResolver<K>): void;
function call<K extends keyof MethodDeclMap>(method: K, ...args: unknown[]): void {
  let params: APICallParams<K> = {};
  let headers: APICallHeaders = {};
  let cb: APICallResolver<K> | undefined;

  if (typeof args[0] === 'object') params = args[0] as APICallParams<K>;
  if (args.length > 1 && typeof args[1] === 'object') headers = args[1] as APICallHeaders;
  if (args.length > 1 && typeof args[1] === 'function') cb = args[1] as APICallResolver<K>;
  if (args.length > 2 && typeof args[2] === 'function') cb = args[2] as APICallResolver<K>;

  request('call', { method, params, headers }, ({ error, result }) => {
    if (cb) cb(error, result);
  });
}

function callAsync<K extends keyof MethodDeclMap>(method: K, data: APICallParams<K>,
  headers: APICallHeaders): Promise<MethodDeclMap[K]['res']> {
  return new Promise((resolve, reject) => {
    call(method, data, headers, (err: any, res: any) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

/**
 * Subscribe event
 */
function on(type: string, cb: EventResolver) {
  if (!listeners[type]) listeners[type] = [];
  listeners[type].push(cb);
}

/**
 * Emit event
 */
function emit(type: string, data: any) {
  if (!listeners[type]) listeners[type] = [];

  for (let i = 0; i < listeners[type].length; i++) {
    listeners[type][i](data);
  }
}

/**
 * Listen worker incoming messages
 */
listenMessage('update', (update) => {
  emit(update._, update);
});

listenMessage('meta_updated', (newMeta) => {
  meta = newMeta;
});

listenMessage('network_updated', (status) => {
  emit('networkChanged', status);
});

// Returns id of authorized user
function getUserID(): number {
  return meta && meta[dc] ? meta[dc].userID as number : 0;
}

// Returns base datacenter
function getBaseDC(): number {
  return dc;
}

// Switches base datacenter
function setBaseDC(dc_id: number) {
  dc = dc_id;
  localStorage.setItem('dc', dc_id.toString());

  task('switch_dc', dc_id);
}

// Returns result of kdf hash algo
function getPasswordKdfAsync(algo: any, password: string): Promise<InputCheckPasswordSRP> {
  return new Promise((resolve) => request('password_kdf', { algo, password }, resolve));
}

function authorize(dc_id: number) {
  return new Promise((resolve) => request('authorize', dc_id, resolve));
}

// Same API as Client without worker
const client = {
  svc: { meta, test },
  call,
  callAsync,
  on,
  updates: { on },
  getUserID,
  getBaseDC,
  setBaseDC,
  getPasswordKdfAsync,
  authorize,
  storage: window.localStorage,
};

// debug
(window as any).client = client;

/**
 * Cache client meta after page closing
 */
window.addEventListener('beforeunload', () => {
  client.storage.setItem(saveMetaField, JSON.stringify(meta));
});

export default client;
