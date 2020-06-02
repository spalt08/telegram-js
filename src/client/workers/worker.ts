/* eslint-disable no-restricted-globals, import/no-extraneous-dependencies */
// import { webp2png } from './extensions/webp';

import { ServiceMessage, ServiceTask } from '../types';
import { webp2png } from './extensions/webp';

const ctx = self as DedicatedWorkerGlobalScope;

ctx.addEventListener('message', (event) => {
  const message = event.data as ServiceMessage;

  switch (message.type) {
    case 'webp': {
      const { url, data } = message.payload;

      const response = webp2png(data);
      caches.open('files').then((cache) => {
        cache.put(url, response);
        ctx.postMessage({ type: 'webp_loaded', payload: { url } } as ServiceTask);
      });

      break;
    }

    default:
  }
});
