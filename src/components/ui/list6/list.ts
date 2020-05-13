import { div } from 'core/html';
import { useInterface, getInterface } from 'core/hooks';
import { listen } from 'core/dom';
import listGroup from './list_group';

import './list.scss';

export default function list() {
  const group = listGroup((container) => container);
  const container = div`.list`(group);
  listen(container, 'scroll', () => {
    getInterface(group).updateVisibleRange(container.scrollTop, container.scrollTop + container.scrollHeight);
  });
  return useInterface(container, {
    addItem: <T>(path: [T, ...any[]], item: Node) => {
      getInterface(group).addItem(path, item);
    },
  });
}
