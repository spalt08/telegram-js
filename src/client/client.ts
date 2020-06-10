import { InputCheckPasswordSRP, MethodDeclMap, UpdateDeclMap, Update, Updates } from 'mtproto-js';
import { EventResolver, APICallHeaders, APICallParams } from './types';
import { task, request, listenMessage } from './context';

/**
 * Update callbacks
 */
const listeners: Record<string, EventResolver[]> = {};

/**
 * Auth Data
 */
let auth = { dc: 2, user: 0 };
let authCached;
if (authCached = localStorage.getItem('auth')) auth = JSON.parse(authCached); // eslint-disable-line no-cond-assign

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
function onUpdate<T extends keyof UpdateDeclMap>(type: T, cb: (event: UpdateDeclMap[T]) => void) {
  on(type, cb);
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

export function fetchUpdates(updateMsg: Updates | Update) {
  switch (updateMsg._) {
    // Ref: https://core.telegram.org/constructor/updateShort
    case 'updateShort':
      emit(updateMsg.update._, updateMsg.update);
      break;

    // Ref: https://core.telegram.org/type/Updates
    case 'updateShortMessage':
    case 'updateShortSentMessage':
    case 'updateShortChatMessage':
      emit(updateMsg._, updateMsg);
      break;

    // Ref: https://core.telegram.org/constructor/updates
    case 'updatesCombined':
    case 'updates':
      // process users
      if (updateMsg.users) {
        for (let i = 0; i < updateMsg.users.length; i += 1) {
          emit('user', updateMsg.users[i]);
        }
      }

      // process chats
      if (updateMsg.chats) {
        for (let i = 0; i < updateMsg.chats.length; i += 1) {
          emit('chat', updateMsg.chats[i]);
        }
      }

      // process updates
      if (updateMsg.updates) {
        for (let i = 0; i < updateMsg.updates.length; i += 1) {
          emit(updateMsg.updates[i]._, updateMsg.updates[i]);
        }
      }
      break;

      // todo: handle updatesTooLong
      // Ref: https://core.telegram.org/api/updates#recovering-gaps

    default:
      emit(updateMsg._, updateMsg);
  }
}

/**
 * Listen worker incoming messages
 */
listenMessage('update', (msg) => fetchUpdates(msg));
listenMessage('network_updated', (status) => emit('networkChanged', status));
listenMessage('authorization_updated', (state) => localStorage.setItem('auth', JSON.stringify(state)));

// Returns id of authorized user
function getUserID(): number {
  return auth.user;
}

// Returns base datacenter
function getBaseDC(): number {
  return auth.dc;
}

// Switches base datacenter
function setBaseDC(dc_id: number) {
  auth.dc = dc_id;
  task('switch_dc', dc_id);
}

// Returns result of kdf hash algo
function getPasswordKdfAsync(algo: any, password: string): Promise<InputCheckPasswordSRP.inputCheckPasswordSRP> {
  return new Promise((resolve) => request('password_kdf', { algo, password }, resolve));
}

function authorize(dc_id: number) {
  return new Promise((resolve) => request('authorize', dc_id, resolve));
}

export default {
  call,
  on,
  updates: { on: onUpdate },
  getUserID,
  getBaseDC,
  setBaseDC,
  getPasswordKdfAsync,
  authorize,
  clear: () => {
  },
};
