import { AuthSentCode, MethodDeclMap } from 'mtproto-js';
import fileMap from './files';

export function mockResponse<T extends keyof MethodDeclMap>(
  method: keyof MethodDeclMap,
  _params: MethodDeclMap[T]['req'],
  _headers: Record<string, any>): [any, MethodDeclMap[T]['res'], number] {
  switch (method) {
    case 'auth.sendCode': {
      return [null, {
        _: 'auth.sentCode',
        type: { _: 'auth.sentCodeTypeApp' },
        phone_code_hash: 'hash',
      } as AuthSentCode.authSentCode, 100];
      break;
    }

    default: {
      return [{ type: 'network', code: 100 }, undefined, 100];
    }
  }
}

export function getMockedFile(id: string): [number, string] {
  console.log('getMockedFile', id, fileMap[id]);
  return fileMap[id] || [1000, ''];
}
