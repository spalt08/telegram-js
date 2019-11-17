import { div, input } from 'core/html';
import { message } from 'services';
import { useObservable } from 'core/hooks';
import { mount } from 'core/dom';
import './message_input.scss';

export default function messageInput() {
  const element = div`.msginput`();

  const container = div`.msginput__container`(
    div`.msginput__bubble_wrap`(
      div`.msginput__bubble`(
        div`.msginput__icon_emoji`(),
        input({ placeholder: 'Message', disabled: true }),
        div`.msginput__icon_attach`(),
      ),
    ),
    div`.msginput__btn`(),
  );

  useObservable(element, message.activePeer, (peer) => {
    if (!peer) return;
    mount(element, container);

    container.classList.remove('hidden');
  });

  return element;
}
