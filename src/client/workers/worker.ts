/* eslint-disable no-restricted-globals, import/no-extraneous-dependencies */
// import { webp2png } from './extensions/webp';

import { ServiceMessage, ServiceTask } from '../types';
import { webp2png } from './extensions/webp';

const ctx = self as DedicatedWorkerGlobalScope;
const tasks: ServiceMessage[] = [];
let isProcessing = false;

function finishTask() {
  isProcessing = false;
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  processTasks();
}

function processTasks() {
  if (isProcessing) return;

  const task = tasks.shift();

  if (!task) return;

  isProcessing = true;

  switch (task.type) {
    case 'webp': {
      const { url, data } = task.payload;
      const blob = webp2png(data);

      ctx.postMessage({ type: 'webp_loaded', payload: { url, blob } } as ServiceTask);
      finishTask();

      break;
    }

    default:
      finishTask();
  }
}

function scheduleTask(task: ServiceMessage) {
  tasks.push(task);
  processTasks();
}

ctx.addEventListener('message', (event) => {
  scheduleTask(event.data);
});
