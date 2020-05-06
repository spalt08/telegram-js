/* eslint-disable no-param-reassign */
import { MethodDeclMap } from 'mtproto-js';
import { users } from './user';
import { chats } from './chat';
import { mockDialogForPeers } from './dialog';

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

export function callMock<T extends keyof MethodDeclMap>(method: keyof MethodDeclMap, _params: MethodDeclMap[T]['req'],
  _headers: Record<string, any>, cb: Callback<T>) {
  switch (method) {
    case 'auth.sendCode': {
      timeout(100, cb, {
        _: 'auth.sentCode',
        type: { _: 'auth.sentCodeTypeApp' },
        phone_code_hash: 'hash',
      });
      break;
    }

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

    default: {
      cb({ type: 'network', code: 100 }, undefined);
    }
  }
}
