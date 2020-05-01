import { MethodDeclMap } from 'mtproto-js';

type Callback<T extends keyof MethodDeclMap> = (err: any, result: MethodDeclMap[T]['res']) => void;

function timeout<T extends keyof MethodDeclMap>(delay: number, cb: Callback<T>, result: MethodDeclMap[T]['res']) {
  setTimeout(() => cb(null, result), delay);
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

    default: {
      cb({ type: 'network', code: 100 }, undefined);
    }
  }
}
