import { Dialog } from 'mtproto-js';
import { Observable } from 'rxjs';
import { dialogCache } from 'cache';
import { isDialogUnread } from 'helpers/api';

export default function makeUnreadCounter(isDialogCounted: (id: string, dialog: Dialog) => boolean) {
  return new Observable<number>((subscriber) => {
    let previousUnreadCount: number | undefined;
    const unread = new Set<string>();

    dialogCache.each((dialog) => {
      if (dialog && isDialogUnread(dialog)) {
        const id = dialogCache.getId(dialog);
        if (isDialogCounted(id, dialog)) {
          unread.add(id);
        }
      }
    });

    const cacheSubscription = dialogCache.changes.subscribe((changes) => {
      changes.forEach(([action, dialog, id]) => {
        switch (action) {
          case 'add':
            if (isDialogUnread(dialog) && isDialogCounted(id, dialog)) {
              unread.add(id);
            }
            break;
          case 'update':
            if (isDialogUnread(dialog) && isDialogCounted(id, dialog)) {
              unread.add(id);
            } else {
              unread.delete(id);
            }
            break;
          case 'remove':
            unread.delete(id);
            break;
          default:
        }
      });

      if (unread.size !== previousUnreadCount) {
        previousUnreadCount = unread.size;
        subscriber.next(previousUnreadCount);
      }
    });

    previousUnreadCount = unread.size;
    subscriber.next(previousUnreadCount);

    return () => cacheSubscription.unsubscribe();
  });
}
