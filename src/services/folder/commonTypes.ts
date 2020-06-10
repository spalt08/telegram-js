import { Observable } from 'rxjs';

export type ListItem = { id: string, pinned?: true };

export interface DialogListIndex {
  // Both observables emit immediately when subscribed to
  // and operate only when subscribed to
  unreadCount: Observable<number>;
  order: Observable<readonly ListItem[]>;
}
