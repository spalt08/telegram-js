/* eslint-disable no-restricted-globals */
import makeResponse from './response';

// Worker context
const ctx: Worker = self as any;

/**
 * Resolve worker task
 */
function resolve(id: string, type: string, payload: any) {
  console.log('mock worker', type, payload);
  ctx.postMessage({ id, type, payload });
}

/**
 * Handle incoming message
 */
ctx.onmessage = (event) => {
  if (!event.data) return;

  const { id, type } = event.data;

  switch (type) {
    case 'call': {
      const { method, params, headers } = event.data.payload;
      const [err, result] = makeResponse(method, params, headers);
      resolve(id, type, { err, result });
      break;
    }

    default:
  }
};


/* For jest testing */
export default class WorkerMock {
  onmessage: undefined | ((event: MessageEvent) => void);

  // eslint-disable-next-line
  constructor() {}
  postMessage(_msg: any): void {}
}
