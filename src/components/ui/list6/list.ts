import { div } from 'core/html';
import { useInterface, getInterface } from 'core/hooks';
import { listen } from 'core/dom';
import listGroup from './list_group';

import './list.scss';

export default function list() {
  const group = listGroup((container) => container);
  const container = div`.list`(group);
  listen(container, 'scroll', () => {
    const { scrollTop } = container;
    getInterface(group).updateVisibleRange(scrollTop - 2000, scrollTop + container.clientHeight + 2000);
    if (scrollTop !== container.scrollTop) {
      container.scrollTo({ top: scrollTop });
    }
  });
  return useInterface(container, {
    insert: getInterface(group).insert,
    size: getInterface(group).size,
  });
}
