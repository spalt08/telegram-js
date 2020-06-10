import { Dialog } from 'mtproto-js';
import { dialogCache } from 'cache';
import { ListItem } from './commonTypes';

export default function getIdsList(pinned: ReadonlySet<string>, isDialogIncluded: (id: string, dialog: Dialog) => boolean): ListItem[] {
  const list: ListItem[] = [];
  const allRecent = dialogCache.indices.recentFirst;

  pinned.forEach((id) => {
    const dialog = dialogCache.get(id);
    if (dialog && isDialogIncluded(id, dialog)) {
      list.push({ id, pinned: true });
    }
  });

  for (let i = 0, l = allRecent.getLength(); i < l; ++i) {
    const id = allRecent.getIdAt(i);
    if (!pinned.has(id)) {
      const dialog = dialogCache.get(id);
      if (dialog && isDialogIncluded(id, dialog)) {
        list.push({ id });
      }
    }
  }

  return list;
}

export function areItemsEqual(item1: Readonly<ListItem>, item2: Readonly<ListItem>): boolean {
  return item1.id === item2.id && item1.pinned === item2.pinned;
}
