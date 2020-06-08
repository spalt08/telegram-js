type CompareFunc<T> = (left: T, right: T) => number;
type Props<T> = {
  compare: CompareFunc<T>;
  process: (task: T, complete: () => void) => void;
};

export class TaskQueue<T extends any> {
  #queue: T[];
  #compare: CompareFunc<T>;
  #process: (task: T, complete: () => void) => void;
  isBusy = false;

  constructor({ compare, process }: Props<T>) {
    this.#compare = compare;
    this.#process = process;
    this.#queue = [];
  }

  register(task: T) {
    this.#queue.push(task);
    this.#queue.sort(this.#compare);
    console.log('register task', this.#queue.length);
    this.next();
  }

  next() {
    if (this.isBusy) return;

    const next = this.#queue.pop();
    if (!next) return;
    console.log('pop task', this.#queue.length);

    this.isBusy = true;
    this.#process(next, this.complete);
  }

  complete = () => {
    console.log('complete task', this.#queue.length);
    this.isBusy = false;
    this.next();
  };
}
