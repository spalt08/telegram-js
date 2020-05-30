/* eslint-disable no-param-reassign */
import { MethodDeclMap } from 'mtproto-js';
import { users } from './user';
import { chats } from './chat';
import { mockDialogForPeers } from './dialog';
import { mockHistorySlice, mockHistorySearch } from './history';

type Callback<T extends keyof MethodDeclMap> = (err: any, result: MethodDeclMap[T]['res']) => void;

function timeout<T extends keyof MethodDeclMap>(delay: number, cb: Callback<T>, result: MethodDeclMap[T]['res']) {
  setTimeout(() => cb(null, result), delay);
}

function shuffle(a: any[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function callMock<T extends keyof MethodDeclMap>(method: T, params: MethodDeclMap[T]['req'],
  headers: Record<string, any>, cb: Callback<T>) {
  switch (method) {
    case 'auth.sendCode':
      timeout(100, cb, {
        _: 'auth.sentCode',
        type: { _: 'auth.sentCodeTypeApp', length: 5 },
        phone_code_hash: 'hash',
      });
      break;

    case 'messages.getDialogs': {
      const { dialogs, messages } = mockDialogForPeers(shuffle([...users, ...chats]));

      timeout<T>(100, cb, {
        _: 'messages.dialogs',
        dialogs,
        messages,
        chats,
        users,
      });
      break;
    }

    case 'messages.getHistory': {
      const { peer, limit, offset_id } = params as MethodDeclMap['messages.getHistory']['req'];
      const { count, messages } = mockHistorySlice(limit, offset_id, peer);

      timeout<T>(100, cb, {
        _: 'messages.messagesSlice',
        messages,
        chats,
        users,
        count,
      });

      break;
    }

    case 'messages.readHistory':
      timeout<T>(100, cb, {
        _: 'messages.AffectedMessages',
        pts: 0,
        pts_count: 0,
      });
      break;

    case 'messages.search': {
      const { peer, filter, limit, offset_id } = params as MethodDeclMap['messages.search']['req'];
      const { count, messages } = mockHistorySearch(limit, offset_id, filter, peer);

      timeout<T>(500, cb, {
        _: 'messages.messagesSlice',
        messages,
        chats,
        users,
        count,
      });
      break;
    }

    default:
      console.log('unmocked call', method, params);
      cb({ type: 'network', code: 100 }, undefined);
  }
}
