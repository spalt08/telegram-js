import { triggerMount } from '../src/core/hooks';

export function withMountTrigger(creator: () => Node) {
  const element = creator();
  triggerMount(element);
  return element;
}
