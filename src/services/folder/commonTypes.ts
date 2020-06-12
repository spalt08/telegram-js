import { Observable } from 'rxjs';
import { DialogFilter } from 'mtproto-js';

export interface UnreadCount {
  count: number;
  hasUnmuted: boolean;
}

export interface DialogListOrder {
  ids: readonly string[];
  pinned: ReadonlySet<string>;
}

export interface DialogListIndex {
  // Both observables emit immediately when subscribed to
  // and operate only when subscribed to.
  // Optimized to have at most 1 subscriber at a time (each subscriber creates a new watcher).
  readonly unreadCount: Observable<Readonly<UnreadCount>>;
  readonly order: Observable<Readonly<DialogListOrder>>;
}

export interface FilterRecord {
  readonly filter: Readonly<DialogFilter>;
  readonly index: DialogListIndex;
}
