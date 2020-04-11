import { InputCheckPasswordSRP, MethodDeclMap, UpdateDeclMap } from 'mtproto-js';
import { EventResolver, APICallHeaders, APICallParams } from './types';
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

function call<K extends keyof MethodDeclMap>(method: K, params: APICallParams<K>,
  headers: APICallHeaders = {}): Promise<MethodDeclMap[K]['res']> {
  return new Promise((resolve, reject) => {
    request('call', { method, params, headers }, ({ error, result }) => {
      if (error) reject(error);
      else resolve(result);
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
 * Subscribe update event
 */
function onUpdate(type: keyof UpdateDeclMap, cb: EventResolver) {
  on(type, cb);
  task('listen_update', type);
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
listenMessage('update', (update) => emit(update._, update));
listenMessage('meta_updated', (newMeta) => meta = newMeta);
listenMessage('network_updated', (status) => emit('networkChanged', status));

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
function getPasswordKdfAsync(algo: any, password: string): Promise<InputCheckPasswordSRP.inputCheckPasswordSRP> {
  return new Promise((resolve) => request('password_kdf', { algo, password }, resolve));
}

function authorize(dc_id: number) {
  return new Promise((resolve) => request('authorize', dc_id, resolve));
}

// Same API as Client without worker
const client = {
  svc: { meta, test },
  call,
  on,
  updates: { on: onUpdate },
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
