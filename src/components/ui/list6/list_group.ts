import { div } from 'core/html';
import { useInterface } from 'core/hooks';
import { mount } from 'core/dom';

import './list_group.scss';

export default function listGroup<TKey>(template: (itemsContainer: Element) => Element) {
  const itemsEl = div`.listGroup__items`();
  const groupEl = template(itemsEl);
  groupEl.classList.add('listGroup');
  return useInterface(groupEl, {
    addItem: (path: [TKey, ...any[]], item: Node) => {
      mount(itemsEl, item);
    },
    updateVisibleRange: (top: number, bottom: number) => {
      // console.log(top, bottom);
    },
  });
}
