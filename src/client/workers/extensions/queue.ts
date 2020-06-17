type CompareFunc<T> = (left: T, right: T) => number;
type Props<T> = {
  compare?: CompareFunc<T>;
  process: (task: T, complete: () => void) => void;
};

export class TaskQueue<T extends any> {
  #queue: T[];
  #compare?: CompareFunc<T>;
  #process: (task: T, complete: () => void) => void;
  isBusy = false;

  constructor({ compare, process }: Props<T>) {
    this.#compare = compare;
    this.#process = process;
    this.#queue = [];
  }

  register(task: T) {
    this.#queue.push(task);
    if (this.#compare) this.#queue.sort(this.#compare);
    this.next();
  }

  next() {
    if (this.isBusy) return;

    const next = this.#queue.shift();
    if (!next) return;

    this.isBusy = true;
    this.#process(next, this.complete);
  }

  complete = () => {
    this.isBusy = false;
    this.next();
  };

  filter = (filterFunc: (value: T, index?: number) => boolean) => {
    this.#queue = this.#queue.filter(filterFunc);
  };
}
