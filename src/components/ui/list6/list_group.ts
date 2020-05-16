import { div } from 'core/html';
import { useInterface, useOnMount } from 'core/hooks';
import { mount, unmount } from 'core/dom';

import './list_group.scss';
import { DistanceTree } from '../list4/distance_tree/distance_tree';

export default function listGroup(template: (itemsContainer: Element) => Element) {
  const itemsEl = div`.listGroup__items`();
  const groupEl = template(itemsEl);
  const heights = new DistanceTree<HTMLElement>();
  const pendingHeightCalc = new Set<Element>();
  let size = 0;
  let itemsTopMargin = 0;
  let itemsBottomMargin = 0;
  let firstVisibleItemIndex = 0;
  let lastVisibleItemIndex = 0;
  let isGroupMounted = false;
  groupEl.classList.add('listGroup');
  useOnMount(itemsEl, () => {
    isGroupMounted = true;
    const itemsRect = itemsEl.getBoundingClientRect();
    const groupRect = groupEl.getBoundingClientRect();
    itemsTopMargin = itemsRect.top - groupRect.top;
    itemsBottomMargin = groupRect.bottom - itemsRect.bottom;
    if (pendingHeightCalc.size > 0) {
      for (let index = 0; index < itemsEl.children.length; index++) {
        const element = itemsEl.children[index];
        heights.updateLength(index, element.clientHeight);
      }
      pendingHeightCalc.clear();
    }
    lastVisibleItemIndex = size - 1;
  });
  return useInterface(groupEl, {
    insert: (index: number, ...items: Element[]) => {
      const before = itemsEl.children[index];
      items.forEach((item) => {
        mount(itemsEl, item, before);
      });
      items.forEach((item, idx) => {
        heights.insert(index + idx, item, item.clientHeight);
        if (!isGroupMounted) {
          pendingHeightCalc.add(item);
        }
      });
      size += items.length;
    },
    size: () => size,
    updateVisibleRange: (top: number, bottom: number) => {
      const firstVisibleItemInfo = heights.getByDistance(top);
      const lastVisibleItemInfo = heights.getByDistance(bottom);
      const paddingTop = firstVisibleItemInfo.outerDistance;
      const paddingBottom = heights.totalLength() - lastVisibleItemInfo.outerDistance + lastVisibleItemInfo.length;

      for (let i = firstVisibleItemInfo.index - 1; i >= firstVisibleItemIndex; i--) {
        console.log(`unmount ${i}`);
        // heights.getByIndex(i).item.style.visibility = 'hidden';
        unmount(heights.getByIndex(i).item);
      }

      for (let i = lastVisibleItemInfo.index + 1; i <= lastVisibleItemIndex; i++) {
        console.log(`unmount ${i}`);
        // heights.getByIndex(i).item.style.visibility = 'hidden';
        unmount(heights.getByIndex(i).item);
      }

      for (let i = firstVisibleItemIndex - 1; i >= firstVisibleItemInfo.index; i--) {
        console.log(`mount ${i}`);
        // heights.getByIndex(i).item.style.removeProperty('visibility');
        mount(itemsEl, heights.getByIndex(i).item, itemsEl.children[0]);
      }

      for (let i = lastVisibleItemIndex + 1; i <= lastVisibleItemInfo.index; i++) {
        console.log(`mount ${i}`);
        // heights.getByIndex(i).item.style.removeProperty('visibility');
        mount(itemsEl, heights.getByIndex(i).item);
      }

      firstVisibleItemIndex = firstVisibleItemInfo.index;
      lastVisibleItemIndex = lastVisibleItemInfo.index;

      itemsEl.style.paddingTop = `${paddingTop}px`;
      itemsEl.style.paddingBottom = `${paddingBottom}px`;

      console.log(firstVisibleItemIndex, lastVisibleItemIndex);
    },
  });
}
