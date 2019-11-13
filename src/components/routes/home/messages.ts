import { div } from 'core/html';
import { useObservable } from 'core/hooks';
import { unmountChildren, mount } from 'core/dom';
import { message as service } from 'services';
import message from './message/message';
import './messages.scss';

export default function messages() {
  const content = div`.messages__history`();
  const container = div`.messages`(content);

  useObservable(content, service.activePeer, () => {
    unmountChildren(content);
  });

  useObservable(content, service.isLoading, (isLoading: boolean) => {
    if (isLoading === false) {
      console.log('loaded', service.history.length);

      for (let i = 0; i < service.history.length; i += 1) {
        mount(content, message(service.history[i]));
      }
    }
  });

  return container;
}
