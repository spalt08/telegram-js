export interface Options<TInput, TOutput> {
  initialInput: TInput;
  debounceTime: number; // In milliseconds
  performOnInit?: boolean;
  shouldPerform?(prevInput: TInput, nextInput: TInput): boolean;
  perform(input: TInput): Promise<TOutput>;
  onOutput?(input: TInput, output: TOutput, isComplete: boolean): void; // isComplete=true means that there is no input being performed now
}

export interface DebounceWithQueue<TInput, TOutput> {
  run(input: TInput, forceNow?: boolean): void;
  destroy(): void;
}

interface ShortQueue<TInput, TOutput> {
  run(input: TInput): void;
  destroy(): void;
}

function makeShortQueue<TInput, TOutput>(
  perform: (input: TInput) => Promise<TOutput>,
  shouldPerform: (prevInput: TInput, nextInput: TInput) => boolean,
  onOutput: (input: TInput, output: TOutput, isComplete: boolean) => void,
): ShortQueue<TInput, TOutput> {
  let isDestroyed = false;
  const queue: TInput[] = []; // The first element is always the input that is currently performing

  return {
    run(input: TInput) {
      if (isDestroyed) {
        return;
      }

      if (queue.length === 0) {
        queue.push(input);
      } else {
        // If the given input matches the current performing input, remove the awaiting input because the given input is being performed
        queue.splice(1);
        if (shouldPerform(queue[0], input)) {
          queue.push(input);
        }
        return;
      }

      (async () => {
        while (queue.length) {
          try {
            const performingInput = queue[0];
            let output: TOutput;
            try {
              // eslint-disable-next-line no-await-in-loop
              output = await perform(performingInput);
            } finally {
              // Keep the current performing input in the queue until the perform end to be able to compare it with new inputs above.
              // Remove before `onOutput` for a case when `run` with the same input is called inside `onOutput`.
              queue.shift();
            }
            if (isDestroyed) {
              return;
            }
            onOutput(performingInput, output, queue.length === 0);
          } catch (error) {
            if (!isDestroyed) {
              // eslint-disable-next-line no-console
              console.error(error);
            }
          }
        }
      })();
    },
    destroy() {
      isDestroyed = true;
    },
  };
}

/**
 * First debounce a long process, than adds it to a short queue of such performances.
 * Short queue here means that a queue contains only the latest input besides the currently performed input.
 * Great for a search implementation.
 */
export default function makeDebounceWithQueue<TInput, TOutput>({
  initialInput,
  debounceTime,
  performOnInit,
  shouldPerform = () => true,
  perform,
  onOutput = () => {},
}: Options<TInput, TOutput>): DebounceWithQueue<TInput, TOutput> {
  let latestInput = initialInput;
  let isDestroyed = false;
  let addToQueueTimeout = 0;
  let performQueue: ShortQueue<TInput, TOutput> | undefined;

  function isDebouncingNow() {
    return !!addToQueueTimeout;
  }

  function runAfterDebounce() {
    // console.log('debounceWithQueue - debounce complete, add to queue', { latestInput });

    if (!performQueue) {
      performQueue = makeShortQueue(perform, shouldPerform, (input, output, isQueueComplete) => {
        // console.log('debounceWithQueue - queue output', { input, output, isQueueComplete, isDebouncingNow: isDebouncingNow() });
        onOutput(input, output, isQueueComplete && !isDebouncingNow());
      });
    }
    performQueue.run(latestInput);
  }

  function run(input: TInput, forceNow = true) {
    if (isDestroyed) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Called `run` on a destroyed object. Ignoring the call.');
      }
      return;
    }

    // console.log('debounceWithQueue - run', { input, forceNow });

    if (!shouldPerform(latestInput, input)) {
      // console.log('debounceWithQueue - matches the latest input, abort');
      return;
    }

    latestInput = input;
    clearTimeout(addToQueueTimeout);
    addToQueueTimeout = 0;

    if (forceNow) {
      if (performQueue) {
        performQueue.destroy();
        performQueue = undefined;
      }
      runAfterDebounce();
    } else {
      addToQueueTimeout = (setTimeout as typeof window.setTimeout)(() => {
        addToQueueTimeout = 0;
        runAfterDebounce();
      }, debounceTime);
    }
  }

  function destroy() {
    if (isDestroyed) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Called `destroy` on a destroyed object. Ignoring the call.');
      }
      return;
    }

    isDestroyed = true;
    clearTimeout(addToQueueTimeout);
    if (performQueue) {
      performQueue.destroy();
    }
  }

  if (performOnInit) {
    runAfterDebounce();
  }

  return { run, destroy };
}
