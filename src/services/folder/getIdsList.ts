import { Dialog } from 'mtproto-js';
import { dialogCache } from 'cache';

export default function getIdsList(pinned: ReadonlySet<string>, isDialogIncluded: (id: string, dialog: Dialog) => boolean): string[] {
  const list: string[] = [];
  const allRecent = dialogCache.indices.recentFirst;

  /*
  pinned.forEach((id) => {
    const dialog = dialogCache.get(id);
    if (dialog && isDialogIncluded(id, dialog)) {
      list.push(id);
    }
  });
   */

  list.push(...pinned);

  for (let i = 0, l = allRecent.getLength(); i < l; ++i) {
    const id = allRecent.getIdAt(i);
    if (!pinned.has(id)) {
      const dialog = dialogCache.get(id);
      if (dialog && isDialogIncluded(id, dialog)) {
        list.push(id);
      }
    }
  }

  return list;
}
