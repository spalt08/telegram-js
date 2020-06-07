import { MaybeObservable } from 'core/types';
import { el, mount, unmount } from 'core/dom';
import { useMaybeObservable } from 'core/hooks';
import { areIteratorsEqual } from 'helpers/data';

export interface Props<TItem> {
  items: MaybeObservable<readonly TItem[]>;
  /** Set it when items may have different values (over time) but must be treated as same items */
  itemToKey?: (items: TItem) => unknown;
  render: (item: TItem) => Node;
  tag?: string;
  props?: Record<string, any>;
}

/**
 * Like `list` but very simple
 */
export default function simpleList<TItem>({
  items,
  render,
  itemToKey = (item) => item,
  tag = 'div',
  props,
}: Props<TItem>) {
  const container = el(tag, props);
  let itemNodes = new Map<unknown, Node>(); // Map is used to keep also the items order

  useMaybeObservable(container, items, (newItems) => {
    const newItemNodes = new Map<unknown, Node>();

    // Get or make a node for every new item
    newItems.forEach((item) => {
      const key = itemToKey(item);
      if (newItemNodes.has(key)) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn(`Two simpleList items have the same key ${JSON.stringify(key)}, ignoring the duplicate`);
        }
      } else {
        const itemNode = itemNodes.get(key) || render(item);
        newItemNodes.set(key, itemNode);
      }
    });

    if (areIteratorsEqual(itemNodes.keys(), newItemNodes.keys())) {
      return; // The old and the new item lists are equal
    }

    // Remove the excess items
    itemNodes.forEach((itemNode, key) => {
      if (!newItemNodes.has(key)) {
        itemNodes.delete(key);
        unmount(itemNode);
      }
    });

    // Add the new items and reorder the list
    let lastInsertedNode: Node | undefined;
    newItemNodes.forEach((node) => {
      mount(container, node, (lastInsertedNode ? lastInsertedNode.nextSibling : container.firstChild) || undefined);
      lastInsertedNode = node;
    });

    itemNodes = newItemNodes;
  });

  return container;
}
