/* eslint-disable no-restricted-globals, import/no-extraneous-dependencies */
import { ServiceMessage, ServiceTask } from '../types';
import { decodeWebP } from './extensions/decoder';
import { encodePNG } from './extensions/encoder';
import { TaskQueue } from './extensions/quene';

type WorkerTask = ServiceMessage & { priority?: number };
const ctx = self as DedicatedWorkerGlobalScope;

/**
 * Encoders
 */
function processWorkerTask(task: WorkerTask, complete: () => void) {
  switch (task.type) {
    case 'webp': {
      const { url, data } = task.payload;
      let bytes = data;

      try {
        const rgba = decodeWebP(data);
        bytes = encodePNG(rgba.data, rgba.width, rgba.height);
      } finally {
        ctx.postMessage({ type: 'webp_loaded', payload: { url, bytes } } as ServiceTask);
      }

      break;
    }

    default:
  }

  complete();
}

const queue = new TaskQueue<WorkerTask>({
  compare: (left, right) => (left.priority || 0) - (right.priority || 0),
  process: processWorkerTask,
});

ctx.addEventListener('message', (event) => {
  queue.register(event.data as WorkerTask);
});
