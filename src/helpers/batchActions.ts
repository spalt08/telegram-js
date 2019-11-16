/**
 * Holds an array of items during batching. Calls `onAct` with the batched actions when the batching is over.
 */
export default class BatchActions<T> {
  protected awaitingActions: T[] = [];

  protected batchDepth = 0;

  constructor(
    protected onAct: (actions: T[]) => void,
  ) {}

  public batch(run: () => void) {
    this.batchDepth += 1;

    try {
      run();
    } finally {
      this.batchDepth -= 1;

      if (this.batchDepth === 0 && this.awaitingActions.length > 0) {
        const actions = this.awaitingActions;
        this.awaitingActions = [];
        this.onAct(actions);
      }
    }
  }

  public act(action: T) {
    if (this.batchDepth > 0) {
      this.awaitingActions.push(action);
    } else {
      this.onAct([action]);
    }
  }
}
