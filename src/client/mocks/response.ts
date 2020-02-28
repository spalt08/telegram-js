import { AuthSentCode } from 'cache/types';

export default function makeResponse(method: string, _params: Record<string, any>, _headers: Record<string, any>): [any, any] {
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
      return [{ type: 'network' }, undefined];
    }
  }
}
