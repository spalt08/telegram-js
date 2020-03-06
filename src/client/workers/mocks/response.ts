import { AuthSentCode, MethodDeclMap } from 'client/schema';
import { ClientError } from 'client/types';

export default function makeResponse<T extends keyof MethodDeclMap>(
  method: keyof MethodDeclMap,
  _params: MethodDeclMap[T]['req'],
  _headers: Record<string, any>): [ClientError | null, MethodDeclMap[T]['res']] {
  switch (method) {
    case 'auth.sendCode': {
      return [null, {
        _: 'auth.sentCode',
        type: { _: 'auth.sentCodeTypeApp' },
        phone_code_hash: 'hash',
      } as AuthSentCode.authSentCode];
      break;
    }

    default: {
      return [{ type: 'network', code: 100 }, undefined];
    }
  }
}

export function makeFileResponse(id: string) {
  switch (id) {
    case 'document_1_y':
      return 'https://file-examples.com/wp-content/uploads/2017/11/file_example_MP3_700KB.mp3';
    default:
      return null;
  }
}
