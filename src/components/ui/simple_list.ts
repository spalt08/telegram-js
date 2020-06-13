import { MaybeObservable } from 'core/types';
import { el, mount, unmount } from 'core/dom';
import { useInterface, useMaybeObservable } from 'core/hooks';
import { areIteratorsEqual } from 'helpers/data';

export interface Props<TItem, TNode extends Node> {
  items: MaybeObservable<readonly TItem[]>;
  /** Set it when items may have different values (over time) but must be treated as same items */
  getItemKey?(items: TItem): unknown;
  render(item: TItem): TNode;
  update?(node: TNode, item: TItem): void;
  tag?: string;
  props?: Record<string, any>;
}

/**
 * Like `list` but very simple
 */
export default function simpleList<TItem, TNode extends Node>({
  items,
  getItemKey = (item) => item,
  render,
  update,
  tag = 'div',
  props,
}: Props<TItem, TNode>) {
  const container = el(tag, props);
  let itemNodes = new Map<unknown, TNode>(); // Map is used to keep also the items order

  useMaybeObservable(container, items, false, (newItems) => {
    const newItemNodes = new Map<unknown, TNode>();

    // Get&update or make a node for every item
    newItems.forEach((item) => {
      const key = getItemKey(item);

      if (newItemNodes.has(key)) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn(`Two simpleList items have the same key ${JSON.stringify(key)}, ignoring the duplicate`);
        }
        return;
      }

      let itemNode = itemNodes.get(key);
      if (itemNode) {
        if (update) update(itemNode, item);
      } else {
        itemNode = render(item);
      }
      newItemNodes.set(key, itemNode);
    });

    if (areIteratorsEqual(itemNodes.keys(), newItemNodes.keys())) {
      return; // The old and the new item lists are equal, no need to swap the nodes
    }

    // Remove the excess items
    itemNodes.forEach((itemNode, key) => {
      if (!newItemNodes.has(key)) {
        itemNodes.delete(key);
        unmount(itemNode);
      }
    });

    // Add the new items and reorder the list
    let lastInsertedNode: TNode | undefined;
    newItemNodes.forEach((node) => {
      mount(container, node, (lastInsertedNode ? lastInsertedNode.nextSibling : container.firstChild) || undefined);
      lastInsertedNode = node;
    });

    itemNodes = newItemNodes;
  });

  return useInterface(container, {
    getItemNode(item: TItem): TNode | undefined {
      return itemNodes.get(getItemKey(item));
    },
    getKeyNode(key: unknown): TNode | undefined {
      return itemNodes.get(key);
    },
  });
}
