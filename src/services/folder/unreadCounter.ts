import { Dialog } from 'mtproto-js';
import { Observable } from 'rxjs';
import { dialogCache } from 'cache';
import { isDialogMuted, isDialogUnread } from 'helpers/api';
import { UnreadCount } from './commonTypes';

export default function makeUnreadCounter(isDialogCounted: (id: string, dialog: Dialog) => boolean) {
  return new Observable<Readonly<UnreadCount>>((subscriber) => {
    const unreadMuted = new Set<string>();
    const unreadUnmuted = new Set<string>();

    dialogCache.each((dialog) => {
      if (dialog && isDialogUnread(dialog)) {
        const id = dialogCache.getId(dialog);
        if (isDialogCounted(id, dialog)) {
          (isDialogMuted(dialog) ? unreadMuted : unreadUnmuted).add(id);
        }
      }
    });

    const lastUnread: UnreadCount = {
      count: unreadMuted.size + unreadUnmuted.size,
      hasUnmuted: unreadUnmuted.size > 0,
    };
    subscriber.next(lastUnread);

    const cacheSubscription = dialogCache.changes.subscribe((changes) => {
      changes.forEach(([action, dialog, id]) => {
        switch (action) {
          case 'add':
            if (isDialogUnread(dialog) && isDialogCounted(id, dialog)) {
              (isDialogMuted(dialog) ? unreadMuted : unreadUnmuted).add(id);
            }
            break;
          case 'update':
            if (isDialogUnread(dialog) && isDialogCounted(id, dialog)) {
              if (isDialogMuted(dialog)) {
                unreadMuted.add(id);
                unreadUnmuted.delete(id);
              } else {
                unreadMuted.delete(id);
                unreadUnmuted.add(id);
              }
            } else {
              unreadMuted.delete(id);
              unreadUnmuted.delete(id);
            }
            break;
          case 'remove':
            unreadMuted.delete(id);
            unreadUnmuted.delete(id);
            break;
          default:
        }
      });

      const count = unreadMuted.size + unreadUnmuted.size;
      const hasUnmuted = unreadUnmuted.size > 0;

      if (count !== lastUnread.count || hasUnmuted !== lastUnread.hasUnmuted) {
        lastUnread.count = count;
        lastUnread.hasUnmuted = hasUnmuted;
        subscriber.next(lastUnread);
      }
    });

    return () => cacheSubscription.unsubscribe();
  });
}
