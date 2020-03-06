/* eslint-disable no-restricted-globals */
import makeResponse, { makeFileResponse } from './mocks/response';

// Worker context
const ctx: Worker = self as any;

/**
 * Resolve worker task
 */
function resolve(id: string, type: string, payload: any) {
  // eslint-disable-next-line no-console
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
    case 'download_file': {
      const { id: fileId } = event.data.payload;
      setTimeout(() => {
        const url = makeFileResponse(fileId);
        resolve(id, type, url);
      }, 2000);
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
