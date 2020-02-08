import { div, input } from 'core/html';
import { mount, listen } from 'core/dom';
import { smile } from 'components/icons';
import stickMojiPanel from './input_stickmoji';
import './input.scss';

export default function messageInput() {
  const element = div`.msginput`();
  const emojiIcon = div`.msginput__emoji`(smile());
  const stickmojiPanelEl = stickMojiPanel();

  const container = div`.msginput__container`(
    div`.msginput__bubble_wrap`(
      stickmojiPanelEl,
      div`.msginput__bubble`(
        emojiIcon,
        input({ placeholder: 'Message', disabled: true }),
        div`.msginput__icon_attach`(),
      ),
    ),
    div`.msginput__btn`(),
  );

  listen(emojiIcon, 'click', () => {
    stickmojiPanelEl.classList.add('opened');
  });

  mount(element, container);
  container.classList.remove('hidden');

  return element;
}
