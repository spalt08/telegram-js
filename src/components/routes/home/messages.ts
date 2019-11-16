import { div } from 'core/html';
import { useObservable } from 'core/hooks';
import { unmountChildren, mount } from 'core/dom';
import { message as service } from 'services';
import message from 'components/message/message';

export default function messages() {
  const content = div`.messages__history`();
  const container = div`.messages`(content);

  // todo: Add loading placeholder

  useObservable(content, service.history, () => {
    unmountChildren(content);
    for (let i = service.history.value.length - 1; i >= 0; i -= 1) {
      mount(content, message(service.history.value[i], service.activePeer.value!));
    }
  });

  return container;
}
