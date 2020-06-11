import { Observable } from 'rxjs';

export interface DialogListOrder {
  ids: readonly string[];
  pinned: ReadonlySet<string>;
}

export interface DialogListIndex {
  // Both observables emit immediately when subscribed to
  // and operate only when subscribed to.
  // Optimized to have at most 1 subscriber at a time (each subscriber creates a new watcher).
  readonly unreadCount: Observable<number>;
  readonly order: Observable<Readonly<DialogListOrder>>;
}
